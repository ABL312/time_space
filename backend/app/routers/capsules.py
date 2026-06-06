"""
Capsule routes — thin delegation to CapsuleService.
All business logic, DB access and transaction management moved to service layer.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..models import CapsuleResponse, NearbyResponse
from ..services.capsule_service import capsule_service

router = APIRouter(prefix="/api/capsules", tags=["capsules"])


# ── Create ──────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_capsule(
    message: str = Form(..., min_length=10, max_length=500),
    latitude: float = Form(...),
    longitude: float = Form(...),
    mood_tag: Optional[str] = Form(None),
    visibility: str = Form("public"),
    target_user_id: Optional[str] = Form(None),
    author_id: Optional[str] = Form(None),
    voice_clone_url: Optional[str] = Form(None),
    unlock_at: Optional[str] = Form(None),
    photos: list[UploadFile] = File(default=[]),
    voice: Optional[UploadFile] = File(None),
):
    """Create a new time capsule with optional photos and voice."""
    return await capsule_service.create_capsule(
        message=message,
        latitude=latitude,
        longitude=longitude,
        mood_tag=mood_tag,
        visibility=visibility,
        target_user_id=target_user_id,
        author_id=author_id,
        voice_clone_url=voice_clone_url,
        unlock_at=unlock_at,
        photos=photos,
        voice=voice,
    )


# ── Read: lists ─────────────────────────────────────────────────

@router.get("/mine")
async def get_my_capsules(user_id: str):
    """Get all capsules created by a specific user."""
    return await capsule_service.get_my_capsules(user_id)


@router.get("/nearby", response_model=NearbyResponse)
async def get_nearby(
    lat: float,
    lng: float,
    radius: int = 1200,
    limit: int = 50,
    user_id: Optional[str] = None,
    scene_mood_match: Optional[str] = None,
):
    """Get nearby capsules sorted by distance, with recommendations."""
    # Validate limit parameter
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
        
    return await capsule_service.get_nearby(
        lat=lat, lng=lng, radius=radius,
        user_id=user_id, scene_mood_match=scene_mood_match,
    )


@router.get("/search")
async def search_capsules(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: int = 5000,
    user_id: Optional[str] = None,
):
    """Search capsules by content, tags, and location."""
    return await capsule_service.search_capsules(
        q=q, tag=tag, lat=lat, lng=lng, radius=radius, user_id=user_id,
    )


@router.get("/daily-recommend")
async def get_daily_recommend():
    """Get today's recommended capsule based on date seed."""
    return await capsule_service.get_daily_recommend()


# ── Read: single ────────────────────────────────────────────────

@router.get("/shared/{share_token}")
async def get_capsule_by_share_token(share_token: str):
    """Get capsule detail by share token. Auto-increments open_count."""
    return await capsule_service.get_capsule_by_share_token(share_token)


@router.get("/{capsule_id}")
async def get_capsule(capsule_id: str):
    """Get capsule detail by ID. Auto-increments open_count."""
    return await capsule_service.get_capsule(capsule_id)


# ── Reply ───────────────────────────────────────────────────────

@router.post("/{capsule_id}/reply", status_code=201)
async def reply_to_capsule(
    capsule_id: str,
    message: str = Form(..., min_length=10, max_length=500),
    author_id: Optional[str] = Form(None),
    photos: list[UploadFile] = File(default=[]),
):
    """Create a reply capsule at the same location."""
    return await capsule_service.reply_to_capsule(
        capsule_id=capsule_id, message=message,
        author_id=author_id, photos=photos,
    )


# ── Share token management ──────────────────────────────────────

@router.post("/{capsule_id}/regenerate-share")
async def regenerate_share_token(capsule_id: str):
    """Regenerate share token for a capsule."""
    return await capsule_service.regenerate_share_token(capsule_id)
