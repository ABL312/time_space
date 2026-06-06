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
from ..config import config
from ..services.emotion_service import emotion_service
from ..services.location_service import LocationService
from ..services.scene_service import SceneService
from ..database import get_db
from ..services.geohash_service import find_nearby_capsules

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Initialize services
location_service = LocationService()
scene_service = SceneService()


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
    # Validate file type
    ALLOWED = {"image/jpeg", "image/png", "image/webp"}
    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_content_type",
                "message": f"Image type '{content_type}' not supported",
                "accepted_types": sorted(ALLOWED),
            },
        )

    # Read content
    content = await image.read()

    # Validate size (10 MB cap)
    MAX_SIZE = 10 * 1024 * 1024
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "message": "Scene image exceeds 10 MB limit",
                "size_bytes": len(content),
                "max_bytes": MAX_SIZE,
            },
        )

    try:
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
    # Import our new service
    from ..services.voice_clone_service import VoiceCloneService
    
    # Initialize service
    voice_service = VoiceCloneService()
    
    # Read sample content
    sample_content = await sample.read()
    sample_filename = sample.filename or "sample.wav"
    
    # Process with our service
    result = await voice_service.clone_and_speak(sample_content, sample_filename, text)
    
    return VoiceCloneResponse(**result)
