"""Voice cloning service using Fish Audio API with fallback support.

Fish Audio API (https://fish.audio):
- Free tier: ~8000 credits/month, no credit card required
- Supports instant voice cloning from 10-30s samples
- API accessible in China without VPN
- Docs: https://api.fish.audio/openapi.json

Workflow:
    1. POST /model → create voice model from sample (train_mode=fast)
    2. POST /v1/tts → generate speech with cloned voice
    3. DELETE /model/{id} → cleanup temporary model
"""

import os
import uuid
from pathlib import Path
from typing import Dict, Any

import httpx


def _load_fish_audio_key() -> str:
    """Load Fish Audio API key from .env file, bypassing os.getenv."""
    env_paths = [
        Path(__file__).parent.parent.parent / ".env",  # backend/.env
        Path(".env"),
    ]
    for env_path in env_paths:
        if env_path.exists():
            for line in env_path.read_text().split("\n"):
                if "FISH_AUDIO_API_KEY" in line and "=" in line:
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if key:
                        return key
    return os.getenv("FISH_AUDIO_API_KEY", "")  # fallback


class VoiceCloneService:
    """Fish Audio voice cloning + TTS service."""

    API_BASE = "https://api.fish.audio"

    def __init__(self):
        self.api_key = _load_fish_audio_key()
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
        self.voice_clones_dir = self.upload_dir / "voice_clones"
        self.voice_clones_dir.mkdir(parents=True, exist_ok=True)

    # ── public entry ──────────────────────────────────────────

    async def clone_and_speak(
        self, sample_bytes: bytes, sample_filename: str, text: str
    ) -> Dict[str, Any]:
        """
        1. 用语音样本创建临时 voice model
        2. 用该 model 朗读 text
        3. 保存克隆语音到 data/uploads/voice_clones/
        4. 返回 { "voice_id": "...", "audio_url": "...", "duration_seconds": ... }

        Fallback (无 API key 或失败):
        - 返回预生成的演示音频 URL
        """
        if not self.api_key:
            print("⚠️ VoiceCloneService: No API key found, using fallback")
            return self._fallback_response()

        print(f"🔑 VoiceCloneService: API key loaded ({len(self.api_key)} chars)")
        try:
            return await self._clone_with_fish_audio(sample_bytes, sample_filename, text)
        except Exception as e:
            print(f"⚠️ Voice cloning error: {e}")
            import traceback
            traceback.print_exc()
            return self._fallback_response()

    # ── Fish Audio implementation ─────────────────────────────

    async def _clone_with_fish_audio(
        self, sample_bytes: bytes, sample_filename: str, text: str
    ) -> Dict[str, Any]:
        """
        Fish Audio API 调用:
        1. POST /model  (multipart) → 创建即时语音模型
        2. POST /v1/tts (json)      → 用模型生成语音 (流式返回 MP3)
        3. DELETE /model/{id}        → 清理临时模型
        """
        headers = {"Authorization": f"Bearer {self.api_key}"}
        model_id = None

        # Use HTTP proxy for WSL (api.fish.audio not directly reachable)
        # Filter out SOCKS proxies to avoid httpx import errors
        raw_proxy = os.getenv("https_proxy") or os.getenv("http_proxy") or ""
        proxy = raw_proxy if raw_proxy.startswith("http://") else None
        async with httpx.AsyncClient(timeout=60.0, proxy=proxy) as client:
            # ── Step 1: Create voice model ──
            files = {
                "voices": (sample_filename, sample_bytes, "audio/webm"),
            }
            data = {
                "visibility": "private",
                "type": "tts",
                "title": f"temp_clone_{uuid.uuid4().hex[:8]}",
                "train_mode": "fast",
            }

            resp = await client.post(
                f"{self.API_BASE}/model",
                headers=headers,
                files=files,
                data=data,
            )
            if resp.status_code not in (200, 201):
                resp.raise_for_status()
            model_data = resp.json()
            model_id = model_data["_id"]
            print(f"✅ Fish Audio model created: {model_id}")

            try:
                # ── Step 2: Generate speech (TTS) ──
                tts_payload = {
                    "text": text,
                    "reference_id": model_id,
                    "format": "mp3",
                    "mp3_bitrate": 128,
                    "latency": "normal",
                }
                tts_headers = {
                    **headers,
                    "Content-Type": "application/json",
                    "model": "s2-pro",
                }

                resp = await client.post(
                    f"{self.API_BASE}/v1/tts",
                    headers=tts_headers,
                    json=tts_payload,
                )
                resp.raise_for_status()
                audio_bytes = resp.content

                # ── Step 3: Save audio file ──
                audio_filename = f"{uuid.uuid4()}.mp3"
                audio_path = self.voice_clones_dir / audio_filename
                with open(audio_path, "wb") as f:
                    f.write(audio_bytes)

                # Estimate duration: 128 kbps MP3 ≈ 16000 bytes/sec
                duration_seconds = (
                    round(len(audio_bytes) / 16000.0, 1)
                    if audio_bytes
                    else len(text) * 0.15
                )

                return {
                    "voice_id": model_id,
                    "audio_url": f"/uploads/voice_clones/{audio_filename}",
                    "duration_seconds": duration_seconds,
                }
            finally:
                # ── Step 4: Cleanup temporary model ──
                try:
                    await client.delete(
                        f"{self.API_BASE}/model/{model_id}",
                        headers=headers,
                    )
                    print(f"🗑️ Fish Audio temp model deleted: {model_id}")
                except Exception as e:
                    print(f"⚠️ Failed to delete temp model {model_id}: {e}")

    # ── fallback ──────────────────────────────────────────────

    def _fallback_response(self) -> Dict[str, Any]:
        """当 Fish Audio 不可用时返回预生成音频。"""
        fallback_path = self.voice_clones_dir / "fallback.mp3"
        if fallback_path.exists():
            return {
                "voice_id": "fallback",
                "audio_url": "/uploads/voice_clones/fallback.mp3",
                "duration_seconds": 3.0,
                "message": "声音克隆服务暂时不可用，使用演示音频",
            }

        return {
            "voice_id": "fallback",
            "audio_url": "/uploads/voice_clones/fallback.mp3",
            "duration_seconds": 0,
            "message": "声音克隆服务暂时不可用，请稍后再试",
        }