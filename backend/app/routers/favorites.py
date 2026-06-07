"""
Favorites router for Time-Space Mailbox.
Handles capsule bookmarking functionality.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import aiosqlite
import uuid
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import CapsuleResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])

class FavoriteStatusResponse(BaseModel):
    is_favorite: bool

@router.post("/{capsule_id}", summary="Bookmark a capsule")
async def add_favorite(
    capsule_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    user_id = current_user["id"]
    """Add a capsule to user's favorites."""
    # Check if capsule exists
    async with db.execute(
        "SELECT id FROM capsules WHERE id = ?", (capsule_id,)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Capsule not found")
    
    # Check if already favorited
    async with db.execute(
        "SELECT id FROM favorites WHERE user_id = ? AND capsule_id = ?",
        (user_id, capsule_id)
    ) as cursor:
        if await cursor.fetchone():
            raise HTTPException(status_code=409, detail="Capsule already favorited")
    
    # Add favorite
    favorite_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    
    await db.execute(
        """
        INSERT INTO favorites (id, user_id, capsule_id, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (favorite_id, user_id, capsule_id, created_at)
    )
    await db.commit()
    
    return {"message": "Capsule added to favorites", "favorite_id": favorite_id}

@router.delete("/{capsule_id}", summary="Remove a capsule from favorites")
async def remove_favorite(
    capsule_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    user_id = current_user["id"]
    """Remove a capsule from user's favorites."""
    # Check if favorited
    async with db.execute(
        "SELECT id FROM favorites WHERE user_id = ? AND capsule_id = ?",
        (user_id, capsule_id)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Favorite not found")
    
    # Remove favorite
    await db.execute(
        "DELETE FROM favorites WHERE user_id = ? AND capsule_id = ?",
        (user_id, capsule_id)
    )
    await db.commit()
    
    return {"message": "Capsule removed from favorites"}

@router.get("/", response_model=List[CapsuleResponse], summary="Get user's favorite capsules")
async def get_favorites(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    user_id = current_user["id"]
    """Get all capsules favorited by a user."""
    capsules = []
    async with db.execute(
        """
        SELECT c.id, c.author_id, c.latitude, c.longitude, c.geohash, 
               c.location_name, c.message, c.voice_url, c.voice_clone_url,
               c.emotion_tags, c.sentiment, c.emotion_intensity, c.emotion_summary,
               c.mood_tag, c.visibility, c.open_count, c.created_at
        FROM capsules c
        INNER JOIN favorites f ON c.id = f.capsule_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        """,
        (user_id,)
    ) as cursor:
        async for row in cursor:
            # Parse JSON fields
            import json
            emotion_tags = json.loads(row[9]) if row[9] else None
            
            capsules.append(CapsuleResponse(
                id=row[0],
                author_id=row[1],
                latitude=row[2],
                longitude=row[3],
                geohash=row[4],
                location_name=row[5],
                message=row[6],
                voice_url=row[7],
                voice_clone_url=row[8],
                emotion_tags=emotion_tags,
                sentiment=row[10],
                emotion_intensity=row[11],
                emotion_summary=row[12],
                mood_tag=row[13],
                visibility=row[14],
                open_count=row[15],
                created_at=row[16],
                media=[]
            ))
    
    # Get media for each capsule
    for capsule in capsules:
        async with db.execute(
            "SELECT id, capsule_id, type, url, thumbnail_url, sort_order FROM media WHERE capsule_id = ? ORDER BY sort_order",
            (capsule.id,)
        ) as media_cursor:
            async for media_row in media_cursor:
                capsule.media.append({
                    "id": media_row[0],
                    "capsule_id": media_row[1],
                    "type": media_row[2],
                    "url": media_row[3],
                    "thumbnail_url": media_row[4],
                    "sort_order": media_row[5]
                })
    
    return capsules

@router.get("/capsules/{capsule_id}/favorite-status", response_model=FavoriteStatusResponse, summary="Check if a capsule is favorited")
async def get_favorite_status(
    capsule_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    user_id = current_user["id"]
    """Check if a capsule is favorited by a user."""
    # Check if capsule exists
    async with db.execute(
        "SELECT id FROM capsules WHERE id = ?", (capsule_id,)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Capsule not found")
    
    # Check if favorited
    async with db.execute(
        "SELECT id FROM favorites WHERE user_id = ? AND capsule_id = ?",
        (user_id, capsule_id)
    ) as cursor:
        is_favorite = await cursor.fetchone() is not None
    
    return {"is_favorite": is_favorite}