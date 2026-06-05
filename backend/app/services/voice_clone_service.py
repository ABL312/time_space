"""Voice cloning service using ElevenLabs API with fallback support."""

import os
import uuid
from pathlib import Path
from typing import Dict, Any
from elevenlabs import ElevenLabs, VoiceSettings
from elevenlabs.client import AsyncElevenLabs


class VoiceCloneService:
    """ElevenLabs voice cloning + TTS service."""
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
        self.voice_clones_dir = self.upload_dir / "voice_clones"
        self.voice_clones_dir.mkdir(parents=True, exist_ok=True)
        
        if self.api_key:
            self.client = AsyncElevenLabs(api_key=self.api_key)
        else:
            self.client = None
    
    async def clone_and_speak(self, sample_bytes: bytes, sample_filename: str, text: str) -> Dict[str, Any]:
        """
        1. 用语音样本创建临时 voice
        2. 用该 voice 朗读 text
        3. 保存克隆语音到 data/uploads/voice_clones/
        4. 返回 { "voice_id": "...", "audio_url": "...", "duration_seconds": 3.5 }
        
        Fallback (无 API key 或失败):
        - 返回预生成的演示音频 URL
        - 或在 data/uploads/voice_clones/ 中放一个 fallback.mp3
        """
        if not self.api_key or not self.client:
            return self._fallback_response()
            
        try:
            return await self._clone_with_elevenlabs(sample_bytes, sample_filename, text)
        except Exception as e:
            print(f"⚠️ Voice cloning error: {e}")
            return self._fallback_response()
    
    async def _clone_with_elevenlabs(self, sample_bytes: bytes, sample_filename: str, text: str) -> Dict[str, Any]:
        """
        ElevenLabs SDK 调用:
        1. client.voices.add(name="temp_clone", files=[sample]) → voice_id
        2. client.text_to_speech.convert(voice_id=voice_id, text=text, 
           model_id="eleven_multilingual_v2",
           voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.8, style=0.3))
        3. 保存 MP3 到 data/uploads/voice_clones/{uuid}.mp3
        4. 删除临时 voice (可选，清理用)
        5. 返回 audio_url = /uploads/voice_clones/{uuid}.mp3
        """
        # Upload voice sample and create a temporary voice
        voice = await self.client.voices.add(
            name=f"temp_clone_{uuid.uuid4().hex[:8]}",
            files=[(sample_filename, sample_bytes)]
        )
        voice_id = voice.voice_id
        
        try:
            # Generate speech using the cloned voice
            audio_generator = await self.client.text_to_speech.convert_async(
                voice_id=voice_id,
                text=text,
                model_id="eleven_multilingual_v2",
                voice_settings=VoiceSettings(
                    stability=0.5,
                    similarity_boost=0.8,
                    style=0.3
                )
            )
            
            # Save audio file
            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = self.voice_clones_dir / audio_filename
            
            # Handle async generator properly
            with open(audio_path, "wb") as f:
                async for chunk in audio_generator:
                    f.write(chunk)
            
            # Calculate approximate duration (ElevenLabs doesn't return this directly in async mode)
            # Rough estimation: 0.15 seconds per character
            duration_seconds = len(text) * 0.15
            
            return {
                "voice_id": voice_id,
                "audio_url": f"/uploads/voice_clones/{audio_filename}",
                "duration_seconds": duration_seconds
            }
        finally:
            # Clean up temporary voice
            try:
                await self.client.voices.delete(voice_id)
            except Exception as e:
                print(f"⚠️ Failed to delete temporary voice {voice_id}: {e}")
    
    def _fallback_response(self) -> Dict[str, Any]:
        """当 ElevenLabs 不可用时返回预生成音频。"""
        # Check if we have a fallback file
        fallback_path = self.voice_clones_dir / "fallback.mp3"
        if fallback_path.exists():
            return {
                "voice_id": "fallback",
                "audio_url": "/uploads/voice_clones/fallback.mp3",
                "duration_seconds": 3.0,
                "message": "声音克隆服务暂时不可用，请稍后再试"
            }
        
        # Create a simple text-to-speech fallback
        return {
            "voice_id": "fallback",
            "audio_url": "/uploads/voice_clones/fallback.mp3",
            "duration_seconds": 0,
            "message": "声音克隆服务暂时不可用，请稍后再试"
        }