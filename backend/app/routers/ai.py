"""
AI service routes: emotion analysis, scene recognition, location context, voice clone.
These are stubs that return mock data when API keys are not configured.
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

router = APIRouter(prefix="/api/ai", tags=["ai"])

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
    # Try reverse geocoding with Nominatim (free)
    location_name = f"{lat:.4f}, {lng:.4f}"
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"https://nominatim.openstreetmap.org/reverse",
                params={
                    "format": "json",
                    "lat": lat,
                    "lon": lng,
                    "accept-language": "zh",
                },
                headers={"User-Agent": "TimeSpaceMailbox/1.0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                location_name = data.get("display_name", location_name)
                # Shorten to just the relevant parts
                parts = location_name.split(", ")
                location_name = ", ".join(parts[:3]) if len(parts) > 3 else location_name
    except Exception as e:
        print(f"⚠️ Geocoding error: {e}")

    return LocationContextResponse(
        name=location_name,
        description=f"这里有来自附近的时空胶囊，举起手机探索吧",
        nearby_capsule_count=0,  # Will be updated by the nearby query
        suggested_moods=["怀旧", "温暖", "希望"],
    )


@router.post("/scene", response_model=SceneResponse)
async def recognize_scene(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
):
    """
    Recognize scene from camera frame using GPT-4o Vision.
    Returns mock data if API key not configured.
    """
    if not OPENAI_API_KEY:
        return SceneResponse(
            scene_type="outdoor",
            description="一个户外场景",
            atmosphere="自然、开放",
            mood_match=["希望", "青春"],
        )

    try:
        import base64
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        content = await image.read()
        b64_image = base64.b64encode(content).decode()

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "分析这张照片的场景类型和氛围。返回JSON格式。",
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_image}",
                            },
                        },
                        {
                            "type": "text",
                            "text": f'返回JSON：{{"scene_type": "...", "description": "...", "atmosphere": "...", "mood_match": [...]}}。mood_match从以下选择：{json.dumps(emotion_service.EMOTION_TAGS, ensure_ascii=False)}',
                        },
                    ],
                },
            ],
            max_tokens=300,
            timeout=5.0,
        )

        result = json.loads(response.choices[0].message.content)
        return SceneResponse(**result)
    except Exception as e:
        print(f"⚠️ Vision API error: {e}")
        return SceneResponse(
            scene_type="outdoor",
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
