"""
Favorites router — thin delegation to FavoriteRepository.
"""
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import aiosqlite
from pydantic import BaseModel

from ..database import get_db_session
from ..models import CapsuleResponse
from ..repositories.favorite_repository import FavoriteRepository

router = APIRouter(prefix="/api/favorites", tags=["favorites"])
_repo = FavoriteRepository()


class FavoriteStatusResponse(BaseModel):
    is_favorite: bool


@router.post("/{capsule_id}", summary="Bookmark a capsule")
async def add_favorite(
    capsule_id: str,
    user_id: str,
    db: aiosqlite.Connection = Depends(get_db_session),
):
    """Add a capsule to user's favorites."""
    cursor = await db.execute("SELECT id FROM capsules WHERE id = ?", (capsule_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Capsule not found")

    if await _repo.check_exists(db, user_id, capsule_id):
        raise HTTPException(status_code=409, detail="Capsule already favorited")

    favorite_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    await _repo.add(db, favorite_id, user_id, capsule_id, created_at)
    return {"message": "Capsule added to favorites", "favorite_id": favorite_id}


@router.delete("/{capsule_id}", summary="Remove a capsule from favorites")
async def remove_favorite(
    capsule_id: str,
    user_id: str,
    db: aiosqlite.Connection = Depends(get_db_session),
):
    """Remove a capsule from user's favorites."""
    if not await _repo.check_exists(db, user_id, capsule_id):
        raise HTTPException(status_code=404, detail="Favorite not found")

    await _repo.remove(db, user_id, capsule_id)
    return {"message": "Capsule removed from favorites"}


@router.get("/", response_model=List[CapsuleResponse],
            summary="Get user's favorite capsules")
async def get_favorites(
    user_id: str,
    offset: int = 0,
    limit: int = 50,
    db: aiosqlite.Connection = Depends(get_db_session),
):
    """Get all capsules favorited by a user, with pagination."""
    capsules_data = await _repo.list_by_user(db, user_id, offset=offset, limit=limit)

    # Batch fetch media
    if capsules_data:
        capsule_ids = [c["id"] for c in capsules_data]
        placeholders = ",".join(["?" for _ in capsule_ids])
        media_map: dict[str, list] = {cid: [] for cid in capsule_ids}
        cursor = await db.execute(
            f"SELECT id, capsule_id, type, url, thumbnail_url, sort_order FROM media WHERE capsule_id IN ({placeholders}) ORDER BY sort_order",
            capsule_ids,
        )
        async for row in cursor:
            cid = row[1]
            if cid in media_map:
                media_map[cid].append({
                    "id": row[0], "capsule_id": cid, "type": row[2],
                    "url": row[3], "thumbnail_url": row[4], "sort_order": row[5],
                })

        capsules = []
        for c in capsules_data:
            capsules.append(CapsuleResponse(
                id=c["id"],
                author_id=c["author_id"],
                latitude=c["latitude"],
                longitude=c["longitude"],
                geohash=c["geohash"],
                location_name=c["location_name"],
                message=c["message"],
                voice_url=c["voice_url"],
                voice_clone_url=c["voice_clone_url"],
                emotion_tags=c["emotion_tags"],
                sentiment=c["sentiment"],
                emotion_intensity=c["emotion_intensity"],
                emotion_summary=c["emotion_summary"],
                mood_tag=c["mood_tag"],
                visibility=c["visibility"],
                open_count=c["open_count"],
                created_at=c["created_at"],
                media=media_map.get(c["id"], []),
            ))
        return capsules

    return []


@router.get("/capsules/{capsule_id}/favorite-status",
            response_model=FavoriteStatusResponse,
            summary="Check if a capsule is favorited")
async def get_favorite_status(
    capsule_id: str,
    user_id: str,
    db: aiosqlite.Connection = Depends(get_db_session),
):
    """Check if a capsule is favorited by a user."""
    cursor = await db.execute("SELECT id FROM capsules WHERE id = ?", (capsule_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Capsule not found")

    is_fav = await _repo.check_exists(db, user_id, capsule_id)
    return {"is_favorite": is_fav}
