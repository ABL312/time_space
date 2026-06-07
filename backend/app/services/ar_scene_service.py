"""Analyze camera frames for AR scene layout using Qwen-VL (通义千问视觉).

This service powers the "寻信 AR" (Smart AR) feature: it takes a camera
snapshot, analyses the scene (indoor/outdoor, ground visibility, open areas,
cluttered zones), and returns an ARSceneLayout with optimal placement for
the AR time-capsule cards.

Supports:
  - Qwen-VL via DashScope / MaaS (DASHSCOPE_API_KEY / QWEN_API_KEY)
  - OpenAI GPT-4o as fallback (OPENAI_API_KEY)
  - Rule-based fallback when no API key is configured

Task #15: AI Visual Scene Recognition + AR screenshot.
"""
import os
import json
import base64
import random
from typing import Dict, Any, Optional


# ── Provider resolution ────────────────────────────────────────────

def _get_vision_client():
    """Return (AsyncOpenAI client, model_name) for the best available provider."""
    import httpx
    from openai import AsyncOpenAI

    model = os.getenv("QWEN_VL_MODEL", "qwen-vl-max")

    # 1. Qwen MaaS / DashScope
    qwen_key = os.getenv("QWEN_API_KEY") or os.getenv("DASHSCOPE_API_KEY", "")
    qwen_base = os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    if qwen_key:
        # MaaS workspace endpoints use wildcard certs that don't match the
        # workspace hostname — skip verification when the URL contains "maas".
        verify_ssl = "maas" not in qwen_base
        http_client = httpx.AsyncClient(verify=verify_ssl)
        return AsyncOpenAI(api_key=qwen_key, base_url=qwen_base, http_client=http_client), model

    # 2. OpenAI fallback
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key and openai_key != "***":
        return AsyncOpenAI(api_key=openai_key), "gpt-4o"

    return None, None


class ARSceneService:
    """AI-powered AR scene layout analyser."""

    def __init__(self):
        self.timeout = float(os.getenv("AR_SCENE_TIMEOUT", "10.0"))

    async def analyse(
        self,
        image_bytes: bytes,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        capsule_count: int = 0,
    ) -> Dict[str, Any]:
        """Main entry point — try vision model, fall back to rule-based."""
        client, model = _get_vision_client()

        if client and model:
            source = "qwen-vl" if "qwen" in model else "gpt-4o"
            try:
                result = await self._analyse_with_vision(client, model, image_bytes, capsule_count)
                if result:
                    result["source"] = source
                    return result
            except Exception as e:
                print(f"⚠️ {model} AR scene analysis failed: {e}")

        # Rule-based fallback
        return self._fallback_layout(capsule_count)

    # ── Vision model path ───────────────────────────────────────────

    async def _analyse_with_vision(
        self,
        client,
        model: str,
        image_bytes: bytes,
        capsule_count: int,
    ) -> Optional[Dict[str, Any]]:
        """Send camera frame to vision model, get structured AR layout."""
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是一个 AR 场景分析引擎。分析摄像头画面，为时空胶囊 AR 卡片推荐最佳放置位置。\n"
                        "场景理解要点：\n"
                        "- 判断 ground_visible: 画面中是否能看到清晰的地面/桌面/水平面\n"
                        "- 找出 safe_zones: 适合放 AR 卡片的干净区域（天空、墙面空白处、平整地面）\n"
                        "- 找出 avoid_zones: 需要避开的区域（人脸、文字、复杂的物体边缘、高亮/过曝区域）\n"
                        "- 用 0-1 归一化坐标 (x,y 为区域中心, width/height 为区域尺寸)\n"
                        "- atmosphere: 用一句有诗意的话描述当前场景氛围，不超过15字\n"
                        "- blessing_copy: 一句 welcome 文案，如「在这片静谧的夜空下，有3封时空来信」\n\n"
                        "严格按 JSON 格式输出，不要任何额外文本。"
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"分析这张摄像头画面。附近有 {capsule_count} 个时空胶囊。\n"
                                "返回 JSON（注意 depth_hint 只能是 near/middle/far）：\n"
                                "{\n"
                                '  "scene_type": "室内|室外|校园|公园|街道|商业区|居住区|其他",\n'
                                '  "ground_visible": true/false,\n'
                                '  "placement": {\n'
                                '    "anchor": "center|top|bottom|left|right",\n'
                                '    "x": 0.5, "y": 0.5, "scale": 0.9,\n'
                                '    "depth_hint": "near|middle|far"\n'
                                "  },\n"
                                '  "safe_zones": [{"x": 0.5, "y": 0.6, "width": 0.4, "height": 0.3, "reason": "天空区域"}],\n'
                                '  "avoid_zones": [{"x": 0.3, "y": 0.4, "width": 0.2, "height": 0.2, "reason": "人脸"}],\n'
                                '  "atmosphere": "午后的校园洒满金色阳光",\n'
                                '  "blessing_copy": "在这片金色校园里，有3封来自陌生人的时空来信",\n'
                                '  "confidence": 0.85\n'
                                "}"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                        },
                    ],
                },
            ],
            response_format={"type": "json_object"},
            timeout=self.timeout,
            max_tokens=512,
        )

        content = response.choices[0].message.content
        if not content:
            return None

        result = json.loads(content)
        return self._normalise(result)

    # ── Fallback ────────────────────────────────────────────────────

    def _fallback_layout(self, capsule_count: int) -> Dict[str, Any]:
        """Rule-based fallback when no vision API is available."""
        atmospheres = [
            "午后的微风中藏着故事",
            "这片天空下有人留过信",
            "阳光洒落的地方有回音",
            "街角的微风捎来问候",
            "此刻的画面里藏着时空",
        ]
        blessings = [
            f"在这片空间里，有 {capsule_count} 封时空来信等待开启",
            f"抬头看，{capsule_count} 封来自陌生人的信笺正在飘落",
            f"这片风景里藏着 {capsule_count} 个故事，等你去发现",
        ] if capsule_count > 0 else [
            "这里还没有人留下过时空来信，成为第一个吧",
            "这片空间静待第一封时空信笺",
        ]

        return {
            "scene_type": "未知",
            "ground_visible": False,
            "placement": {
                "anchor": "bottom_center",
                "x": 0.5,
                "y": 0.65,
                "scale": 0.88,
                "depth_hint": "middle",
            },
            "safe_zones": [
                {
                    "x": 0.5,
                    "y": 0.55,
                    "width": 0.45,
                    "height": 0.35,
                    "reason": "屏幕中央下方安全展示区域",
                }
            ],
            "avoid_zones": [],
            "atmosphere": random.choice(atmospheres),
            "blessing_copy": random.choice(blessings),
            "confidence": 0.35,
            "source": "rule_fallback",
        }

    # ── Helpers ─────────────────────────────────────────────────────

    def _normalise(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Clamp & validate the vision model output to safe ranges."""
        placement = raw.get("placement", {})
        placement["x"] = max(0.1, min(0.9, float(placement.get("x", 0.5))))
        placement["y"] = max(0.1, min(0.9, float(placement.get("y", 0.5))))
        placement["scale"] = max(0.5, min(1.3, float(placement.get("scale", 0.9))))
        depth = placement.get("depth_hint", "middle")
        if depth not in ("near", "middle", "far"):
            depth = "middle"
        placement["depth_hint"] = depth
        placement.setdefault("anchor", "center")

        safe_zones = raw.get("safe_zones", [])
        if not safe_zones:
            safe_zones = [
                {"x": 0.5, "y": 0.55, "width": 0.4, "height": 0.3, "reason": "默认安全区"}
            ]

        avoid_zones = raw.get("avoid_zones", [])

        return {
            "scene_type": raw.get("scene_type", "未知"),
            "ground_visible": bool(raw.get("ground_visible", False)),
            "placement": placement,
            "safe_zones": safe_zones,
            "avoid_zones": avoid_zones,
            "atmosphere": raw.get("atmosphere", ""),
            "blessing_copy": raw.get("blessing_copy", ""),
            "confidence": max(0.0, min(1.0, float(raw.get("confidence", 0.5)))),
        }
