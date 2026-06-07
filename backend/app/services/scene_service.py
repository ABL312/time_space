"""Analyze camera/photo images for scene context using Qwen-VL (通义千问视觉).

Supports:
  - Qwen-VL via DashScope / MaaS (DASHSCOPE_API_KEY / QWEN_API_KEY)
  - OpenAI GPT-4o as fallback (OPENAI_API_KEY)
  - GPS-based fallback when no API key is configured
"""

import os
import json
import base64
from typing import Dict, Optional


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
        verify_ssl = "maas" not in qwen_base
        http_client = httpx.AsyncClient(verify=verify_ssl)
        return AsyncOpenAI(api_key=qwen_key, base_url=qwen_base, http_client=http_client), model

    # 2. OpenAI fallback
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key and openai_key != "***":
        return AsyncOpenAI(api_key=openai_key), "gpt-4o"

    return None, None


class SceneService:
    """Analyze camera/photo images for scene context using Qwen-VL."""

    SCENE_TYPES = ["校园", "公园", "商业区", "居民区", "交通枢纽", "历史文化", "自然景观", "室内"]

    MOOD_TAGS = [
        "怀旧", "温暖", "感恩", "浪漫", "思念",
        "快乐", "遗憾", "鼓励", "幽默", "神秘",
        "孤独", "希望", "青春", "友情", "亲情", "爱情"
    ]

    def __init__(self):
        from ..services.location_service import LocationService
        self.location_service = LocationService()

    async def analyze(self, image_bytes: bytes, lat: float = None, lng: float = None) -> Dict:
        """Returns scene_type, description, atmosphere, mood_match."""
        client, model = _get_vision_client()

        if client and model:
            try:
                result = await self._analyze_with_vision(client, model, image_bytes)
                if result:
                    return result
            except Exception as e:
                print(f"⚠️ {model} scene analysis failed: {e}")

        return await self._fallback_scene(lat, lng)

    async def _analyze_with_vision(self, client, model: str, image_bytes: bytes) -> Optional[Dict]:
        """Call vision model, return scene analysis."""
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "请分析这张图片的场景类型、氛围描述和匹配的情绪标签。用中文回答，严格按 JSON 格式输出：\n"
                                "{\n"
                                '  "scene_type": "校园|公园|商业区|居民区|交通枢纽|历史文化|自然景观|室内",\n'
                                '  "description": "场景的详细描述，不超过50个字",\n'
                                '  "atmosphere": "场景的整体氛围，不超过20个字",\n'
                                '  "mood_match": ["情绪1", "情绪2", "情绪3"]\n'
                                "}\n\n"
                                "情绪标签只能从以下列表中选择（最多3个）："
                                "怀旧、温暖、感恩、浪漫、思念、快乐、遗憾、鼓励、"
                                "幽默、神秘、孤独、希望、青春、友情、亲情、爱情"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                        },
                    ],
                },
            ],
            response_format={"type": "json_object"},
            timeout=8.0,
        )

        content = response.choices[0].message.content
        if not content:
            return None

        result = json.loads(content)

        if all(k in result for k in ["scene_type", "description", "atmosphere", "mood_match"]):
            if result["scene_type"] in self.SCENE_TYPES:
                valid_moods = [m for m in result["mood_match"] if m in self.MOOD_TAGS]
                result["mood_match"] = valid_moods[:3]
                return result

        return None

    async def _fallback_scene(self, lat: float = None, lng: float = None) -> Dict:
        """GPS-based + default fallback."""
        if lat is not None and lng is not None:
            try:
                ctx = await self.location_service.get_context(lat, lng)

                scene_type_map = {
                    "school": "校园", "college": "校园", "university": "校园",
                    "park": "自然景观", "garden": "自然景观", "lake": "自然景观",
                    "mountain": "自然景观", "station": "交通枢纽", "airport": "交通枢纽",
                }
                scene_type = "未知"
                for key, value in scene_type_map.items():
                    if key in ctx.get("name", "").lower():
                        scene_type = value
                        break

                return {
                    "scene_type": scene_type,
                    "description": ctx.get("description", "一个充满故事的地方"),
                    "atmosphere": "基于位置推断的场景",
                    "mood_match": ctx.get("suggested_moods", ["温暖", "希望"])[:3],
                }
            except Exception as e:
                print(f"⚠️ Location service fallback failed: {e}")

        return {
            "scene_type": "未知",
            "description": "一个充满故事的地方",
            "atmosphere": "神秘而有趣",
            "mood_match": ["温暖", "希望"],
        }
