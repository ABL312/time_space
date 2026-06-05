"""
Pydantic models for request validation and response serialization.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ==========================================
# User models
# ==========================================
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=20)
    interest_tags: list[str] = Field(..., min_length=3, max_length=3)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=20)
    interest_tags: Optional[list[str]] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str] = None
    interest_tags: list[str]
    created_at: str


# ==========================================
# Capsule models
# ==========================================
class CapsuleCreate(BaseModel):
    message: str = Field(..., min_length=10, max_length=500)
    latitude: float
    longitude: float
    mood_tag: Optional[str] = None
    visibility: str = "public"
    target_user_id: Optional[str] = None


class CapsuleResponse(BaseModel):
    id: str
    author_id: str
    author: Optional[dict] = None
    latitude: float
    longitude: float
    geohash: str
    location_name: Optional[str] = None
    message: str
    voice_url: Optional[str] = None
    voice_clone_url: Optional[str] = None
    emotion_tags: Optional[list[str]] = None
    sentiment: Optional[str] = None
    emotion_intensity: Optional[float] = None
    emotion_summary: Optional[str] = None
    mood_tag: Optional[str] = None
    visibility: str = "public"
    open_count: int = 0
    created_at: str
    media: Optional[list[dict]] = None
    distance_m: Optional[float] = None
    match_score: Optional[float] = None
    match_reasons: Optional[list[str]] = None


class NearbyResponse(BaseModel):
    location_context: Optional[dict] = None
    total: int
    recommended: list[CapsuleResponse]
    others: list[CapsuleResponse]


# ==========================================
# Media models
# ==========================================
class MediaResponse(BaseModel):
    id: str
    capsule_id: str
    type: str
    url: str
    thumbnail_url: Optional[str] = None
    sort_order: int = 0


# ==========================================
# AI models
# ==========================================
class EmotionAnalysisRequest(BaseModel):
    message: str


class EmotionAnalysisResponse(BaseModel):
    emotions: list[str]
    sentiment: str
    intensity: float
    summary: str


class SceneResponse(BaseModel):
    scene_type: str
    description: str
    atmosphere: str
    mood_match: list[str]


class LocationContextResponse(BaseModel):
    name: str
    description: str
    nearby_capsule_count: int = 0
    suggested_moods: list[str] = []


class VoiceCloneResponse(BaseModel):
    voice_id: str
    audio_url: str
    duration_seconds: float


# ==========================================
# Interaction models
# ==========================================
class InteractionCreate(BaseModel):
    capsule_id: str
    user_id: str
    action: str  # open/reply/react
    reaction: Optional[str] = None
