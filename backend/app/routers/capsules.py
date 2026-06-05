"""
Capsule CRUD and nearby query routes.
"""
import asyncio
import uuid
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..database import get_db
from ..models import CapsuleResponse, NearbyResponse
from ..services.geohash_service import encode, find_nearby_capsules, haversine_distance
from ..services.recommend_service import rank_capsules
from ..services.storage_service import storage_service
from ..services.emotion_service import emotion_service

router = APIRouter(prefix="/api/capsules", tags=["capsules"])


async def _analyze_and_update_emotion(capsule_id: str, message: str):
    """Background task: analyze emotion and update capsule in DB."""
    try:
        result = await emotion_service.analyze(message)
        db = await get_db()
        try:
            await db.execute(
                """
                UPDATE capsules
                SET emotion_tags = ?, sentiment = ?, emotion_intensity = ?, emotion_summary = ?
                WHERE id = ?
                """,
                (
                    json.dumps(result["emotions"], ensure_ascii=False),
                    result["sentiment"],
                    result["intensity"],
                    result["summary"],
                    capsule_id,
                ),
            )
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        print(f"Background emotion analysis failed for {capsule_id}: {e}")


def _parse_capsule_row(row: dict) -> dict:
    """Convert a raw DB row to a capsule dict with parsed JSON fields."""
    capsule = dict(row)
    
    # Parse JSON fields
    for field in ("emotion_tags", "interest_tags"):
        val = capsule.get(field)
        if val and isinstance(val, str):
            try:
                capsule[field] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                capsule[field] = []

    # Build author info
    if capsule.get("author_name"):
        capsule["author"] = {
            "name": capsule.pop("author_name", ""),
            "avatar": capsule.pop("author_avatar", None),
        }

    return capsule


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
    photos: list[UploadFile] = File(default=[]),
    voice: Optional[UploadFile] = File(None),
):
    """Create a new time capsule with optional photos and voice."""
    capsule_id = str(uuid.uuid4())
    geohash = encode(latitude, longitude)

    db = await get_db()
    try:
        # Insert capsule
        await db.execute(
            """
            INSERT INTO capsules (id, author_id, latitude, longitude, geohash,
                message, mood_tag, visibility, target_user_id, voice_clone_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (capsule_id, author_id, latitude, longitude, geohash,
             message, mood_tag, visibility, target_user_id, voice_clone_url),
        )

        # Handle photo uploads via StorageService
        for i, photo in enumerate(photos[:5]):  # Max 5 photos
            # Skip empty file slots (browser sometimes sends empty UploadFile)
            if not photo.filename and not photo.content_type:
                continue
            try:
                result = await storage_service.save_photo(photo)
            except HTTPException:
                # Skip invalid photos rather than failing the whole request
                continue

            media_id = str(uuid.uuid4())
            await db.execute(
                """
                INSERT INTO media (id, capsule_id, type, url, thumbnail_url, sort_order)
                VALUES (?, ?, 'photo', ?, ?, ?)
                """,
                (media_id, capsule_id, result["url"], result["thumbnail_url"], i),
            )

        # Handle voice upload via StorageService
        if voice and voice.filename:
            try:
                result = await storage_service.save_voice(voice)
                voice_url = result["url"]

                await db.execute(
                    "UPDATE capsules SET voice_url = ? WHERE id = ?",
                    (voice_url, capsule_id),
                )
            except HTTPException:
                # Skip invalid voice rather than failing the whole request
                pass

        await db.commit()

        # Kick off async emotion analysis (non-blocking)
        asyncio.create_task(_analyze_and_update_emotion(capsule_id, message))

        # Fetch and return the created capsule
        cursor = await db.execute(
            "SELECT * FROM capsules WHERE id = ?", (capsule_id,)
        )
        row = await cursor.fetchone()
        capsule = _parse_capsule_row(dict(row))

        # Fetch media
        cursor = await db.execute(
            "SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order",
            (capsule_id,),
        )
        media_rows = await cursor.fetchall()
        capsule["media"] = [dict(m) for m in media_rows]

        return capsule

    finally:
        await db.close()


@router.get("/nearby", response_model=NearbyResponse)
async def get_nearby(
    lat: float,
    lng: float,
    radius: int = 1200,
    user_id: Optional[str] = None,
    scene_mood_match: Optional[str] = None,
):
    """Get nearby capsules sorted by distance, with recommendations."""
    db = await get_db()
    try:
        # Find nearby capsules
        capsules = await find_nearby_capsules(db, lat, lng, radius_m=radius)

        # Get user interest tags for ranking
        user_interest_tags = []
        if user_id:
            cursor = await db.execute(
                "SELECT interest_tags FROM users WHERE id = ?", (user_id,)
            )
            row = await cursor.fetchone()
            if row and row[0]:
                try:
                    user_interest_tags = json.loads(row[0])
                    # Ensure it's a list
                    if not isinstance(user_interest_tags, list):
                        user_interest_tags = []
                except (json.JSONDecodeError, TypeError):
                    user_interest_tags = []

        # Parse scene mood match if provided
        scene_moods = None
        if scene_mood_match:
            try:
                scene_moods = json.loads(scene_mood_match)
                if not isinstance(scene_moods, list):
                    scene_moods = None
            except (json.JSONDecodeError, TypeError):
                pass

        # Rank and split
        recommended, others = rank_capsules(
            capsules, user_interest_tags, scene_mood_match=scene_moods, top_n=3
        )

        # Format responses
        def format_capsule(c: dict) -> dict:
            parsed = _parse_capsule_row(c)
            return CapsuleResponse(
                id=parsed["id"],
                author_id=parsed.get("author_id", ""),
                author=parsed.get("author"),
                latitude=parsed["latitude"],
                longitude=parsed["longitude"],
                geohash=parsed["geohash"],
                location_name=parsed.get("location_name"),
                message=parsed["message"],
                voice_url=parsed.get("voice_url"),
                voice_clone_url=parsed.get("voice_clone_url"),
                emotion_tags=parsed.get("emotion_tags"),
                sentiment=parsed.get("sentiment"),
                emotion_intensity=parsed.get("emotion_intensity"),
                emotion_summary=parsed.get("emotion_summary"),
                mood_tag=parsed.get("mood_tag"),
                visibility=parsed.get("visibility", "public"),
                open_count=parsed.get("open_count", 0),
                created_at=str(parsed.get("created_at", "")),
                distance_m=parsed.get("distance_m"),
                match_score=parsed.get("match_score"),
                match_reasons=parsed.get("match_reasons"),
            )

        return NearbyResponse(
            total=len(capsules),
            recommended=[format_capsule(c) for c in recommended],
            others=[format_capsule(c) for c in others],
        )
    finally:
        await db.close()


@router.get("/{capsule_id}")
async def get_capsule(capsule_id: str):
    """Get capsule detail by ID. Auto-increments open_count."""
    db = await get_db()
    try:
        # Increment open_count
        await db.execute(
            "UPDATE capsules SET open_count = open_count + 1 WHERE id = ?",
            (capsule_id,),
        )
        await db.commit()

        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
            """,
            (capsule_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Capsule not found")

        capsule = _parse_capsule_row(dict(row))

        # Fetch media
        cursor = await db.execute(
            "SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order",
            (capsule_id,),
        )
        media_rows = await cursor.fetchall()
        capsule["media"] = [dict(m) for m in media_rows]

        # Record interaction
        interaction_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO interactions (id, capsule_id, user_id, action)
            VALUES (?, ?, NULL, 'open')
            """,
            (interaction_id, capsule_id),
        )
        await db.commit()

        return capsule
    finally:
        await db.close()


@router.post("/{capsule_id}/reply", status_code=201)
async def reply_to_capsule(
    capsule_id: str,
    message: str = Form(..., min_length=10, max_length=500),
    author_id: Optional[str] = Form(None),
    photos: list[UploadFile] = File(default=[]),
):
    """Create a reply capsule at the same location."""
    db = await get_db()
    try:
        # Get original capsule location
        cursor = await db.execute(
            "SELECT latitude, longitude FROM capsules WHERE id = ?",
            (capsule_id,),
        )
        original = await cursor.fetchone()
        if not original:
            raise HTTPException(status_code=404, detail="Original capsule not found")

        lat, lng = original[0], original[1]

        # Create reply at same location
        reply_id = str(uuid.uuid4())
        geohash = encode(lat, lng)
        await db.execute(
            """
            INSERT INTO capsules (id, author_id, latitude, longitude, geohash, message, visibility)
            VALUES (?, ?, ?, ?, ?, ?, 'public')
            """,
            (reply_id, author_id, lat, lng, geohash, message),
        )

        # Handle photos via StorageService
        for i, photo in enumerate(photos[:5]):
            if not photo.filename and not photo.content_type:
                continue
            try:
                result = await storage_service.save_photo(photo)
            except HTTPException:
                continue

            media_id = str(uuid.uuid4())
            await db.execute(
                """
                INSERT INTO media (id, capsule_id, type, url, thumbnail_url, sort_order)
                VALUES (?, ?, 'photo', ?, ?, ?)
                """,
                (media_id, reply_id, result["url"], result["thumbnail_url"], i),
            )

        # Record interaction
        interaction_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO interactions (id, capsule_id, user_id, action)
            VALUES (?, ?, ?, 'reply')
            """,
            (interaction_id, capsule_id, author_id),
        )

        await db.commit()

        # Fetch the created reply capsule with author info and media
        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
            """,
            (reply_id,),
        )
        row = await cursor.fetchone()
        reply_capsule = _parse_capsule_row(dict(row))

        # Fetch media
        cursor = await db.execute(
            "SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order",
            (reply_id,),
        )
        media_rows = await cursor.fetchall()
        reply_capsule["media"] = [dict(m) for m in media_rows]

        return reply_capsule
    finally:
        await db.close()
