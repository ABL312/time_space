"""AI service routes: emotion analysis, scene recognition, location context, voice clone.
These are implemented with dedicated services and proper fallback handling.
"""

import os
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from ..models import (
    EmotionAnalysisRequest,
    EmotionAnalysisResponse,
    SceneResponse,
    LocationContextResponse,
    VoiceCloneResponse,
)
from ..services.emotion_service import emotion_service
from ..services.location_service import LocationService
from ..services.scene_service import SceneService
from ..database import get_db
from ..services.geohash_service import find_nearby_capsules

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Initialize services
location_service = LocationService()
scene_service = SceneService()

# Check for API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")


@router.post("/analyze-emotion", response_model=EmotionAnalysisResponse)
async def analyze_emotion(data: EmotionAnalysisRequest):
    """
    Analyze emotion in a capsule message.
    Uses GPT-4o-mini if API key available, falls back to keyword matching.
    Delegates to EmotionService for all logic.
    """
    if not data.message or not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = await emotion_service.analyze(data.message)
    return EmotionAnalysisResponse(
        emotions=result["emotions"],
        sentiment=result["sentiment"],
        intensity=result["intensity"],
        summary=result["summary"],
    )


@router.get("/location-context", response_model=LocationContextResponse)
async def get_location_context(lat: float, lng: float):
    """
    Get location context description from GPS coordinates.
    Uses reverse geocoding + GPT if available.
    """
    try:
        result = await location_service.get_context(lat, lng)
        return LocationContextResponse(**result)
    except Exception as e:
        print(f"⚠️ Location context error: {e}")
        # Fallback response
        return LocationContextResponse(
            name="未知位置",
            description="一个神秘的地点",
            nearby_capsule_count=0,
            suggested_moods=["温暖", "希望"],
        )


@router.post("/scene", response_model=SceneResponse)
async def recognize_scene(
    image: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
):
    """
    Recognize scene from camera frame using GPT-4o Vision.
    Returns fallback data if API key not configured or analysis fails.
    """
    try:
        content = await image.read()
        result = await scene_service.analyze(content, latitude, longitude)
        return SceneResponse(**result)
    except Exception as e:
        print(f"⚠️ Scene recognition error: {e}")
        # Fallback response
        return SceneResponse(
            scene_type="未知",
            description="场景识别暂时不可用",
            atmosphere="未知",
            mood_match=["希望"],
        )


@router.post("/voice-clone", response_model=VoiceCloneResponse)
async def voice_clone(
    sample: UploadFile = File(...),
    text: str = Form(...),
):
    """
    Clone voice from audio sample and generate speech.
    Returns mock response if ElevenLabs API key not configured.
    """
    if not ELEVENLABS_API_KEY:
        return VoiceCloneResponse(
            voice_id="mock-voice-id",
            audio_url="/uploads/voice_clones/demo.mp3",
            duration_seconds=len(text) * 0.15,
        )

    try:
        from elevenlabs import ElevenLabs
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

        # Upload voice sample
        sample_content = await sample.read()
        voice = client.voices.add(
            name="temp_clone",
            files=[(sample.filename or "sample.webm", sample_content, sample.content_type or "audio/webm")],
        )

        # Generate speech
        audio = client.text_to_speech.convert(
            voice_id=voice.voice_id,
            text=text,
            model_id="eleven_multilingual_v2",
            voice_settings={
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.3,
            },
        )

        # Save audio file
        import uuid
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_path = os.path.join(
            os.getenv("UPLOAD_DIR", "./data/uploads"), "voice_clones", audio_filename
        )
        os.makedirs(os.path.dirname(audio_path), exist_ok=True)
        with open(audio_path, "wb") as f:
            for chunk in audio:
                f.write(chunk)

        return VoiceCloneResponse(
            voice_id=voice.voice_id,
            audio_url=f"/uploads/voice_clones/{audio_filename}",
            duration_seconds=0,  # Will be calculated by frontend
        )
    except Exception as e:
        print(f"⚠️ ElevenLabs API error: {e}")
        return VoiceCloneResponse(
            voice_id="error",
            audio_url="/uploads/voice_clones/demo.mp3",
            duration_seconds=0,
        )
