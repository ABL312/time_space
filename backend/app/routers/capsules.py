"""
Capsule CRUD and nearby query routes.
"""
import asyncio
import uuid
import json
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..database import get_db
from ..models import CapsuleResponse, NearbyResponse
from ..services.geohash_service import encode, find_nearby_capsules, haversine_distance, calculate_bounding_box
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
    unlock_at: Optional[str] = Form(None),  # Time lock feature
    photos: list[UploadFile] = File(default=[]),
    voice: Optional[UploadFile] = File(None),
):
    """Create a new time capsule with optional photos and voice."""
    capsule_id = str(uuid.uuid4())
    geohash = encode(latitude, longitude)

    db = await get_db()
    try:
        # Parse unlock_at if provided
        unlock_at_dt = None
        if unlock_at:
            try:
                unlock_at_dt = datetime.fromisoformat(unlock_at.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid unlock_at format. Use ISO format.")

        # Insert capsule
        await db.execute(
            """
            INSERT INTO capsules (id, author_id, latitude, longitude, geohash,
                message, mood_tag, visibility, target_user_id, voice_clone_url, unlock_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (capsule_id, author_id, latitude, longitude, geohash,
             message, mood_tag, visibility, target_user_id, voice_clone_url, unlock_at_dt),
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


@router.get("/mine")
async def get_my_capsules(user_id: str):
    """Get all capsules created by a specific user."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.author_id = ?
            ORDER BY c.created_at DESC
            LIMIT 50
            """,
            (user_id,),
        )
        rows = await cursor.fetchall()

        capsules = []
        for row in rows:
            capsule = _parse_capsule_row(dict(row))

            # Fetch media for each capsule
            media_cursor = await db.execute(
                "SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order",
                (capsule["id"],),
            )
            media_rows = await media_cursor.fetchall()
            capsule["media"] = [dict(m) for m in media_rows]

            capsules.append(capsule)

        return {"capsules": capsules, "total": len(capsules)}
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
        # Find nearby capsules (only unlocked or expired)
        current_time = datetime.utcnow().isoformat()
        capsules = await find_nearby_capsules(db, lat, lng, radius_m=radius, 
                                            additional_where="AND (unlock_at IS NULL OR unlock_at <= ?)",
                                            additional_params=(current_time,))

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
            # Handle None values for required string fields
            author_id = parsed.get("author_id") or ""
            created_at = str(parsed.get("created_at", ""))
            
            return CapsuleResponse(
                id=parsed["id"],
                author_id=author_id,
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
                created_at=created_at,
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
        
        # Check if capsule is time-locked
        unlock_at = capsule.get("unlock_at")
        if unlock_at:
            unlock_datetime = datetime.fromisoformat(unlock_at.replace("Z", "+00:00"))
            current_datetime = datetime.utcnow()
            
            if unlock_datetime > current_datetime:
                # Capsule is locked, return special response
                countdown_seconds = int((unlock_datetime - current_datetime).total_seconds())
                return {
                    "locked": True,
                    "unlock_at": unlock_at,
                    "countdown_seconds": countdown_seconds
                }

        # Increment open_count for unlocked capsules
        await db.execute(
            "UPDATE capsules SET open_count = open_count + 1 WHERE id = ?",
            (capsule_id,),
        )
        await db.commit()

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
    db = await get_db()
    try:
        # Build query dynamically based on provided parameters
        base_query = """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE 1=1
        """
        params = []
        
        # Text search in message content
        if q:
            base_query += " AND c.message LIKE ?"
            params.append(f"%{q}%")
        
        # Tag filtering (emotion_tags)
        if tag:
            # Split comma-separated tags if provided
            tags = [t.strip() for t in tag.split(",")]
            tag_conditions = " OR ".join(["c.emotion_tags LIKE ?" for _ in tags])
            base_query += f" AND ({tag_conditions})"
            for t in tags:
                params.append(f"%{t}%")
        
        # Location-based filtering
        if lat is not None and lng is not None:
            # Calculate bounding box for initial filtering
            min_lat, max_lat, min_lng, max_lng = calculate_bounding_box(lat, lng, radius)
            
            base_query += " AND c.latitude BETWEEN ? AND ? AND c.longitude BETWEEN ? AND ?"
            params.extend([min_lat, max_lat, min_lng, max_lng])
        
        # Only show unlocked capsules
        current_time = datetime.utcnow().isoformat()
        base_query += " AND (c.unlock_at IS NULL OR c.unlock_at <= ?)"
        params.append(current_time)
        
        base_query += " ORDER BY c.created_at DESC LIMIT 100"
        
        cursor = await db.execute(base_query, params)
        rows = await cursor.fetchall()
        
        # Process results and filter by precise distance if location search
        capsules = []
        for row in rows:
            capsule = _parse_capsule_row(dict(row))
            
            # Precise distance filtering for location-based searches
            if lat is not None and lng is not None:
                from ..services.geohash_service import haversine_distance
                capsule_lat = capsule["latitude"]
                capsule_lng = capsule["longitude"]
                distance = haversine_distance(lat, lng, capsule_lat, capsule_lng)
                
                # Skip capsules outside the radius
                if distance > radius:
                    continue
                
                capsule["distance_m"] = distance
            
            # Fetch media
            media_cursor = await db.execute(
                "SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order",
                (capsule["id"],),
            )
            media_rows = await media_cursor.fetchall()
            capsule["media"] = [dict(m) for m in media_rows]
            
            capsules.append(capsule)
        
        # Apply recommendation ranking if user_id is provided
        if user_id and capsules:
            # Get user interest tags for ranking
            user_interest_tags = []
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
            
            # Simple ranking by user interests
            if user_interest_tags:
                for capsule in capsules:
                    match_score = 0
                    match_reasons = []
                    
                    # Check emotion tags match
                    capsule_tags = capsule.get("emotion_tags", [])
                    if capsule_tags:
                        for tag in user_interest_tags:
                            if tag in capsule_tags:
                                match_score += 1
                                match_reasons.append(f"匹配情感标签: {tag}")
                    
                    capsule["match_score"] = match_score
                    capsule["match_reasons"] = match_reasons
                
                # Sort by match score
                capsules.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        
        return {"capsules": capsules, "total": len(capsules)}
        
    finally:
        await db.close()