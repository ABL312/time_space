"""
VoiceService — ElevenLabs voice cloning + text-to-speech.

Workflow:
    1. Upload a ~10s voice sample → clone voice
    2. Provide text → generate speech in cloned voice
    3. Return audio URL for playback

Fallback: returns demo audio when API is unavailable.
"""
import os
import uuid
from pathlib import Path
from typing import Optional

from elevenlabs import ElevenLabs
from elevenlabs.types import VoiceSettings


class VoiceService:
    """Handles voice cloning and TTS via ElevenLabs API."""

    def __init__(self, upload_dir: Path):
        self.upload_dir = upload_dir
        self.voice_clones_dir = upload_dir / "voice_clones"
        self.voice_clones_dir.mkdir(parents=True, exist_ok=True)

        self.api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None

    async def clone_and_speak(
        self,
        sample: bytes,
        text: str,
        sample_filename: str = "sample.webm",
        sample_content_type: str = "audio/webm",
    ) -> dict:
        """
        Clone voice from audio sample, then generate speech from text.

        Args:
            sample: Raw audio bytes (voice sample).
            text: Text to synthesize in the cloned voice.
            sample_filename: Original filename of the sample.
            sample_content_type: MIME type of the sample (e.g. audio/webm).

        Returns:
            dict with keys: voice_id, audio_url, duration_seconds.
        """
        if not self.client or not self.api_key:
            return self._fallback(text)

        try:
            # ── Step 1: Clone voice from sample ──
            voice = self.client.voices.add(
                name=f"temp_clone_{uuid.uuid4().hex[:8]}",
                files=[
                    (sample_filename, sample, sample_content_type),
                ],
            )

            # ── Step 2: Generate speech from text ──
            audio_chunks = self.client.text_to_speech.convert(
                voice_id=voice.voice_id,
                text=text,
                model_id="eleven_multilingual_v2",
                voice_settings=VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.8,
                    style=0.3,
                ),
                output_format="mp3_44100_128",
            )

            # ── Step 3: Save audio to disk ──
            audio_bytes = b"".join(audio_chunks)
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = self.voice_clones_dir / audio_filename
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)

            # Rough duration estimate: bytes / (bitrate / 8)
            # 128 kbps MP3 ≈ 16000 bytes per second
            duration = len(audio_bytes) / 16000.0

            return {
                "voice_id": voice.voice_id,
                "audio_url": f"/uploads/voice_clones/{audio_filename}",
                "duration_seconds": round(duration, 1),
            }

        except Exception as e:
            print(f"⚠️ ElevenLabs API error: {e}")
            return self._fallback(text)

    def _fallback(self, text: str) -> dict:
        """
        Fallback response when ElevenLabs is unavailable.
        Returns a static demo audio URL.
        Place a demo.mp3 file in data/uploads/voice_clones/ for this to work.
        """
        return {
            "voice_id": "fallback",
            "audio_url": "/uploads/voice_clones/demo.mp3",
            "duration_seconds": max(1.0, len(text) * 0.15),
        }
