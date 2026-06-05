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

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Check for API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# 16 emotion tags
EMOTION_TAGS = [
    "怀旧", "温暖", "感恩", "浪漫", "思念", "快乐",
    "遗憾", "鼓励", "幽默", "神秘", "孤独", "希望",
    "青春", "友情", "亲情", "爱情",
]

# Keyword fallback mapping
KEYWORD_MAP = {
    "怀旧": ["回忆", "从前", "曾经", "当年", "那时候", "旧时光", "记忆"],
    "温暖": ["温暖", "温馨", "暖", "幸福", "美好"],
    "感恩": ["感谢", "感恩", "谢谢", "幸运"],
    "浪漫": ["爱", "浪漫", "约会", "心动", "喜欢"],
    "思念": ["想念", "思念", "牵挂", "远方"],
    "快乐": ["开心", "快乐", "高兴", "笑", "哈哈", "欢乐"],
    "遗憾": ["遗憾", "可惜", "来不及", "错过"],
    "鼓励": ["加油", "努力", "坚持", "勇敢", "相信"],
    "幽默": ["搞笑", "有趣", "哈哈", "笑死", "段子"],
    "神秘": ["秘密", "神秘", "未知", "探索"],
    "孤独": ["孤独", "一个人", "寂寞", "独自"],
    "希望": ["希望", "期待", "未来", "梦想", "明天"],
    "青春": ["青春", "毕业", "校园", "同学", "大学"],
    "友情": ["朋友", "友谊", "兄弟", "闺蜜"],
    "亲情": ["家人", "父母", "爷爷奶奶", "家", "亲人"],
    "爱情": ["爱情", "恋人", "男朋友", "女朋友", "老公", "老婆"],
}


def _keyword_fallback(message: str) -> EmotionAnalysisResponse:
    """Fallback emotion analysis using keyword matching."""
    found_emotions = []
    for emotion, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw in message:
                found_emotions.append(emotion)
                break
        if len(found_emotions) >= 3:
            break

    if not found_emotions:
        found_emotions = ["温暖", "希望"]

    return EmotionAnalysisResponse(
        emotions=found_emotions[:4],
        sentiment="positive",
        intensity=0.6,
        summary=f"包含{', '.join(found_emotions[:2])}情感的留言",
    )


@router.post("/analyze-emotion", response_model=EmotionAnalysisResponse)
async def analyze_emotion(data: EmotionAnalysisRequest):
    """
    Analyze emotion in a capsule message.
    Uses GPT-4o-mini if API key available, falls back to keyword matching.
    """
    if not OPENAI_API_KEY:
        return _keyword_fallback(data.message)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"""你是一个情感分析助手。分析时空信箱留言的情感特征。
请返回JSON格式，emotions从以下选择2-4个：{json.dumps(EMOTION_TAGS, ensure_ascii=False)}""",
                },
                {"role": "user", "content": f"留言内容：{data.message}"},
            ],
            response_format={"type": "json_object"},
            timeout=3.0,
        )

        result = json.loads(response.choices[0].message.content)
        return EmotionAnalysisResponse(
            emotions=result.get("emotions", ["温暖"]),
            sentiment=result.get("sentiment", "positive"),
            intensity=float(result.get("intensity", 0.6)),
            summary=result.get("summary", ""),
        )
    except Exception as e:
        print(f"⚠️ OpenAI API error: {e}, using keyword fallback")
        return _keyword_fallback(data.message)


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
                            "text": f'返回JSON：{{"scene_type": "...", "description": "...", "atmosphere": "...", "mood_match": [...]}}。mood_match从以下选择：{json.dumps(EMOTION_TAGS, ensure_ascii=False)}',
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
