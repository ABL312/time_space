"""
Pydantic models for request validation and response serialization.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


# ==========================================
# User models
# ==========================================
class UserCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    name: str = Field(..., min_length=1, max_length=20)
    interest_tags: list[str] = Field(..., min_length=3, max_length=3)


class UserUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    name: Optional[str] = Field(None, min_length=1, max_length=20)
    interest_tags: Optional[list[str]] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    avatar_url: Optional[str] = None
    interest_tags: list[str]
    token: Optional[str] = None
    created_at: str


# ==========================================
# Capsule models
# ==========================================
class CapsuleCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    message: str = Field(..., min_length=10, max_length=500)
    latitude: float
    longitude: float
    mood_tag: Optional[str] = None
    visibility: str = "public"
    target_user_id: Optional[str] = None
    unlock_at: Optional[str] = None  # ISO format datetime string


class CapsuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
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
    unlock_at: Optional[str] = None  # ISO format datetime string
    open_count: int = 0
    created_at: str
    media: Optional[list[dict]] = None
    distance_m: Optional[float] = None
    match_score: Optional[float] = None
    match_reasons: Optional[list[str]] = None


class NearbyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    location_context: Optional[dict] = None
    total: int
    recommended: list[CapsuleResponse]
    others: list[CapsuleResponse]


# ==========================================
# Media models
# ==========================================
class MediaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
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
    model_config = ConfigDict(from_attributes=True)
    
    message: str


class EmotionAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    emotions: list[str]
    sentiment: str
    intensity: float
    summary: str


class SceneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    scene_type: str
    description: str
    atmosphere: str
    mood_match: list[str]


class LocationContextResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    name: str
    description: str
    nearby_capsule_count: int = 0
    suggested_moods: list[str] = []


class VoiceCloneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    voice_id: str
    audio_url: str
    duration_seconds: float
    message: Optional[str] = None


# ==========================================
# AR Scene Layout model (#15)
# ==========================================
class ARPlacement(BaseModel):
    anchor: str = "center"
    x: float = 0.5
    y: float = 0.5
    scale: float = 0.9
    depth_hint: str = "middle"  # near | middle | far


class ARZone(BaseModel):
    x: float
    y: float
    width: float
    height: float
    reason: str = ""


class ARSceneLayoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    scene_type: str = "未知"
    ground_visible: bool = False
    placement: ARPlacement = ARPlacement()
    safe_zones: list[ARZone] = []
    avoid_zones: list[ARZone] = []
    atmosphere: str = ""
    blessing_copy: str = ""
    confidence: float = 0.5
    source: Optional[str] = None


# ==========================================
# Interaction models
# ==========================================
class InteractionCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    capsule_id: str
    user_id: str
    action: str  # open/reply/react
    reaction: Optional[str] = None


# ==========================================
# Response models
# ==========================================
class ResponseCreateModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    user_id: Optional[str] = None
    nickname: str = "匿名"
    content: str = Field(..., min_length=1, max_length=500)


class ResponseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    capsule_id: str
    user_id: Optional[str] = None
    nickname: str
    content: str
    created_at: str