"""
Capsule service — business logic layer for capsule operations.
Manages DB connections, transaction boundaries, and coordinates
capsule + media + interaction repositories.
"""
import asyncio
import json
import uuid
import secrets
import string
from typing import Optional
from datetime import datetime

from fastapi import HTTPException, UploadFile

from ..database import get_db
from ..config import config
from ..repositories.capsule_repository import CapsuleRepository
from ..repositories.interaction_repository import InteractionRepository
from ..services.geohash_service import encode, find_nearby_capsules
from ..services.recommend_service import rank_capsules
from ..services.storage_service import storage_service
from ..services.emotion_service import emotion_service

_capsule_repo = CapsuleRepository()
_interaction_repo = InteractionRepository()


def _generate_share_token(length: int = 8) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def _analyze_and_update_emotion(capsule_id: str, message: str):
    """Background task: analyze emotion and update capsule in DB."""
    try:
        result = await emotion_service.analyze(message)
        db = await get_db()
        try:
            await _capsule_repo.update_emotion(
                db, capsule_id,
                result["emotions"], result["sentiment"],
                result["intensity"], result["summary"],
            )
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        print(f"Background emotion analysis failed for {capsule_id}: {e}")


class CapsuleService:

    # ── Create capsule ──────────────────────────────────────────

    async def create_capsule(
        self,
        message: str,
        latitude: float,
        longitude: float,
        mood_tag: Optional[str],
        visibility: str,
        target_user_id: Optional[str],
        author_id: Optional[str],
        voice_clone_url: Optional[str],
        unlock_at: Optional[str],
        photos: list[UploadFile],
        voice: Optional[UploadFile],
    ) -> dict:
        capsule_id = str(uuid.uuid4())
        geohash = encode(latitude, longitude)
        share_token = _generate_share_token()

        # Parse unlock_at
        unlock_at_dt = None
        if unlock_at:
            try:
                unlock_at_dt = datetime.fromisoformat(
                    unlock_at.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid unlock_at format. Use ISO format.")

        db = await get_db()
        try:
            await _capsule_repo.create(
                db,
                id=capsule_id,
                author_id=author_id,
                latitude=latitude,
                longitude=longitude,
                geohash=geohash,
                message=message,
                mood_tag=mood_tag,
                visibility=visibility,
                target_user_id=target_user_id,
                voice_clone_url=voice_clone_url,
                unlock_at=unlock_at_dt,
                share_token=share_token,
            )

            # Handle photos
            for i, photo in enumerate(photos[:5]):
                if not photo.filename and not photo.content_type:
                    continue
                try:
                    result = await storage_service.save_photo(photo)
                except HTTPException:
                    continue
                media_id = str(uuid.uuid4())
                await _capsule_repo.add_media(
                    db, media_id, capsule_id, "photo",
                    result["url"], result["thumbnail_url"], i,
                )

            # Handle voice
            if voice and voice.filename:
                try:
                    result = await storage_service.save_voice(voice)
                    await _capsule_repo.update_voice_url(
                        db, capsule_id, result["url"])
                except HTTPException:
                    pass

            await db.commit()

            # Background emotion analysis
            asyncio.create_task(
                _analyze_and_update_emotion(capsule_id, message))

            # Return created capsule
            capsule = await _capsule_repo.get_by_id(db, capsule_id)
            media = await _capsule_repo.get_media_for_capsule(db, capsule_id)
            capsule["media"] = media
            return capsule

        finally:
            await db.close()

    # ── Get capsule ──────────────────────────────────────────────

    async def get_capsule(self, capsule_id: str) -> dict:
        db = await get_db()
        try:
            capsule = await _capsule_repo.get_by_id(db, capsule_id)
            if not capsule:
                raise HTTPException(status_code=404, detail="Capsule not found")

            # Time-lock check
            unlock_at = capsule.get("unlock_at")
            if unlock_at:
                unlock_datetime = datetime.fromisoformat(
                    unlock_at.replace("Z", "+00:00"))
                if unlock_datetime > datetime.utcnow():
                    countdown = int(
                        (unlock_datetime - datetime.utcnow()).total_seconds())
                    return {
                        "locked": True,
                        "unlock_at": unlock_at,
                        "countdown_seconds": countdown,
                    }

            await _capsule_repo.increment_open_count(db, capsule_id)
            await _interaction_repo.create(db, capsule_id, None, "open")
            await db.commit()

            media = await _capsule_repo.get_media_for_capsule(db, capsule_id)
            capsule["media"] = media
            return capsule
        finally:
            await db.close()

    async def get_capsule_by_share_token(self, share_token: str) -> dict:
        db = await get_db()
        try:
            capsule = await _capsule_repo.get_by_share_token(db, share_token)
            if not capsule:
                raise HTTPException(
                    status_code=404, detail="Capsule not found")

            # Time-lock check
            unlock_at = capsule.get("unlock_at")
            if unlock_at:
                unlock_datetime = datetime.fromisoformat(
                    unlock_at.replace("Z", "+00:00"))
                if unlock_datetime > datetime.utcnow():
                    countdown = int(
                        (unlock_datetime - datetime.utcnow()).total_seconds())
                    return {
                        "locked": True,
                        "unlock_at": unlock_at,
                        "countdown_seconds": countdown,
                    }

            await _capsule_repo.increment_open_count(
                db, capsule["share_token"])
            await _interaction_repo.create(
                db, capsule["id"], None, "open")
            await db.commit()

            media = await _capsule_repo.get_media_for_capsule(
                db, capsule["id"])
            capsule["media"] = media
            return capsule
        finally:
            await db.close()

    # ── List capsules ────────────────────────────────────────────

    async def get_my_capsules(self, user_id: str) -> dict:
        db = await get_db()
        try:
            capsules = await _capsule_repo.list_by_author(db, user_id)
            ids = [c["id"] for c in capsules]
            media_map = await _capsule_repo.get_media_batch(db, ids)
            for c in capsules:
                c["media"] = media_map.get(c["id"], [])
            return {"capsules": capsules, "total": len(capsules)}
        finally:
            await db.close()

    async def get_nearby(
        self, lat: float, lng: float, radius: int = 1200,
        user_id: Optional[str] = None,
        scene_mood_match: Optional[str] = None,
    ) -> dict:
        from ..repositories.user_repository import UserRepository
        user_repo = UserRepository()

        db = await get_db()
        try:
            current_time = datetime.utcnow().isoformat()
            capsules_raw = await find_nearby_capsules(
                db, lat, lng, radius_m=radius,
                additional_where="AND (unlock_at IS NULL OR unlock_at <= ?)",
                additional_params=(current_time,),
            )

            # Get user interest tags
            user_interest_tags = []
            if user_id:
                user_interest_tags = await user_repo.get_interest_tags(
                    db, user_id)

            # Parse scene mood match
            scene_moods = None
            if scene_mood_match:
                try:
                    scene_moods = json.loads(scene_mood_match)
                    if not isinstance(scene_moods, list):
                        scene_moods = None
                except (json.JSONDecodeError, TypeError):
                    pass

            recommended, others = rank_capsules(
                capsules_raw, user_interest_tags,
                scene_mood_match=scene_moods, top_n=3,
            )

            return {
                "total": len(capsules_raw),
                "recommended": recommended,
                "others": others,
            }
        finally:
            await db.close()

    async def search_capsules(
        self, q: Optional[str] = None, tag: Optional[str] = None,
        lat: Optional[float] = None, lng: Optional[float] = None,
        radius: int = 5000, user_id: Optional[str] = None,
    ) -> dict:
        from ..repositories.user_repository import UserRepository
        from ..services.geohash_service import (
            haversine_distance, calculate_bounding_box)
        user_repo = UserRepository()

        db = await get_db()
        try:
            base_query = """
                SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
                FROM capsules c LEFT JOIN users u ON c.author_id = u.id
                WHERE 1=1
            """
            params = []

            if q:
                base_query += " AND c.message LIKE ?"
                params.append(f"%{q}%")

            if tag:
                tags = [t.strip() for t in tag.split(",")]
                tag_conditions = " OR ".join(
                    ["c.emotion_tags LIKE ?" for _ in tags])
                base_query += f" AND ({tag_conditions})"
                for t in tags:
                    params.append(f"%{t}%")

            if lat is not None and lng is not None:
                min_lat, max_lat, min_lng, max_lng = calculate_bounding_box(
                    lat, lng, radius)
                base_query += " AND c.latitude BETWEEN ? AND ? AND c.longitude BETWEEN ? AND ?"
                params.extend([min_lat, max_lat, min_lng, max_lng])

            current_time = datetime.utcnow().isoformat()
            base_query += " AND (c.unlock_at IS NULL OR c.unlock_at <= ?)"
            params.append(current_time)
            base_query += " ORDER BY c.created_at DESC LIMIT 100"

            cursor = await db.execute(base_query, params)
            rows = await cursor.fetchall()

            capsules = []
            for row in rows:
                capsule = _capsule_repo._format_capsule(dict(row))
                if lat is not None and lng is not None:
                    dist = haversine_distance(
                        lat, lng, capsule["latitude"], capsule["longitude"])
                    if dist > radius:
                        continue
                    capsule["distance_m"] = dist
                capsules.append(capsule)

            # Batch fetch media
            ids = [c["id"] for c in capsules]
            media_map = await _capsule_repo.get_media_batch(db, ids)
            for c in capsules:
                c["media"] = media_map.get(c["id"], [])

            # Ranking
            if user_id and capsules:
                user_tags = await user_repo.get_interest_tags(db, user_id)
                if user_tags:
                    for c in capsules:
                        match_score = 0
                        reasons = []
                        c_tags = c.get("emotion_tags", [])
                        if c_tags:
                            for t in user_tags:
                                if t in c_tags:
                                    match_score += 1
                                    reasons.append(f"匹配情感标签: {t}")
                        c["match_score"] = match_score
                        c["match_reasons"] = reasons
                    capsules.sort(key=lambda x: x.get(
                        "match_score", 0), reverse=True)

            return {"capsules": capsules, "total": len(capsules)}
        finally:
            await db.close()

    async def get_daily_recommend(self) -> dict:
        from datetime import date, timedelta
        import random

        db = await get_db()
        try:
            today = date.today()
            seed_val = int(today.strftime("%Y%m%d"))
            random.seed(seed_val)

            current_time = datetime.utcnow().isoformat()
            capsules = await _capsule_repo.list_highly_rated(
                db, limit=50, current_time=current_time)

            if not capsules:
                capsules = await _capsule_repo.list_public(
                    db, limit=50, current_time=current_time)

            if not capsules:
                raise HTTPException(
                    status_code=404,
                    detail="No capsules available for recommendation")

            selected = random.choice(capsules)
            media = await _capsule_repo.get_media_for_capsule(
                db, selected["id"])
            selected["media"] = media

            reasons = []
            if selected.get("open_count", 0) > 10:
                reasons.append("今日最受欢迎")
            if selected.get("emotion_intensity", 0) > 0.7:
                reasons.append("情感强烈推荐")
            if selected.get("mood_tag"):
                reasons.append(f"{selected['mood_tag']}主题精选")
            if not reasons:
                reasons.append("今日特别推荐")

            tomorrow = datetime.combine(
                today + timedelta(days=1), datetime.min.time())
            expires_at = tomorrow.isoformat() + "Z"

            return {
                "capsule": selected,
                "reason": "、".join(reasons),
                "expires_at": expires_at,
            }
        finally:
            await db.close()

    # ── Reply ───────────────────────────────────────────────────

    async def reply_to_capsule(
        self, capsule_id: str, message: str,
        author_id: Optional[str], photos: list[UploadFile],
    ) -> dict:
        db = await get_db()
        try:
            loc = await _capsule_repo.get_location(db, capsule_id)
            if not loc:
                raise HTTPException(
                    status_code=404, detail="Original capsule not found")

            lat, lng = loc
            reply_id = str(uuid.uuid4())
            geohash = encode(lat, lng)

            await db.execute(
                """INSERT INTO capsules (id, author_id, latitude, longitude,
                   geohash, message, visibility)
                   VALUES (?, ?, ?, ?, ?, ?, 'public')""",
                (reply_id, author_id, lat, lng, geohash, message),
            )

            for i, photo in enumerate(photos[:5]):
                if not photo.filename and not photo.content_type:
                    continue
                try:
                    result = await storage_service.save_photo(photo)
                except HTTPException:
                    continue
                media_id = str(uuid.uuid4())
                await _capsule_repo.add_media(
                    db, media_id, reply_id, "photo",
                    result["url"], result["thumbnail_url"], i,
                )

            await _interaction_repo.create(
                db, capsule_id, author_id, "reply")
            await db.commit()

            reply = await _capsule_repo.get_by_id(db, reply_id)
            media = await _capsule_repo.get_media_for_capsule(db, reply_id)
            reply["media"] = media
            return reply
        finally:
            await db.close()

    # ── Share token ──────────────────────────────────────────────

    async def regenerate_share_token(self, capsule_id: str) -> dict:
        db = await get_db()
        try:
            if not await _capsule_repo.check_exists(db, capsule_id):
                raise HTTPException(
                    status_code=404, detail="Capsule not found")
            new_token = _generate_share_token()
            await _capsule_repo.update_share_token(
                db, capsule_id, new_token)
            return {"share_token": new_token}
        finally:
            await db.close()


# Singleton
capsule_service = CapsuleService()
