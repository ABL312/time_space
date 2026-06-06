"""
Capsule repository — database operations for capsules + media.
"""
import json
from typing import Optional
from datetime import datetime
from .base import parse_json_field, row_to_dict, batch_fetch_media


class CapsuleRepository:
    """Data access for capsules and media."""

    # ── Create ──────────────────────────────────────────────────

    async def create(self, db, **fields) -> str:
        """Insert a capsule. Returns the capsule_id."""
        await db.execute(
            """
            INSERT INTO capsules (id, author_id, latitude, longitude, geohash,
                message, mood_tag, visibility, target_user_id, voice_clone_url,
                unlock_at, share_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fields["id"],
                fields.get("author_id"),
                fields["latitude"],
                fields["longitude"],
                fields["geohash"],
                fields["message"],
                fields.get("mood_tag"),
                fields.get("visibility", "public"),
                fields.get("target_user_id"),
                fields.get("voice_clone_url"),
                fields.get("unlock_at"),
                fields.get("share_token"),
            ),
        )
        return fields["id"]

    async def add_media(self, db, media_id: str, capsule_id: str,
                        media_type: str, url: str, thumbnail_url: Optional[str],
                        sort_order: int):
        await db.execute(
            """
            INSERT INTO media (id, capsule_id, type, url, thumbnail_url, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (media_id, capsule_id, media_type, url, thumbnail_url, sort_order),
        )

    async def update_voice_url(self, db, capsule_id: str, voice_url: str):
        await db.execute(
            "UPDATE capsules SET voice_url = ? WHERE id = ?",
            (voice_url, capsule_id),
        )

    async def update_emotion(self, db, capsule_id: str, emotions: list[str],
                             sentiment: str, intensity: float, summary: str):
        await db.execute(
            """UPDATE capsules
               SET emotion_tags = ?, sentiment = ?, emotion_intensity = ?,
                   emotion_summary = ?
               WHERE id = ?""",
            (json.dumps(emotions, ensure_ascii=False), sentiment, intensity,
             summary, capsule_id),
        )

    # ── Read: Single ─────────────────────────────────────────────

    async def get_by_id(self, db, capsule_id: str) -> Optional[dict]:
        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c LEFT JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
            """,
            (capsule_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return self._format_capsule(dict(row))

    async def get_by_share_token(self, db, share_token: str) -> Optional[dict]:
        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c LEFT JOIN users u ON c.author_id = u.id
            WHERE c.share_token = ?
            """,
            (share_token,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return self._format_capsule(dict(row))

    async def get_location(self, db, capsule_id: str) -> Optional[tuple]:
        cursor = await db.execute(
            "SELECT latitude, longitude FROM capsules WHERE id = ?",
            (capsule_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return (row[0], row[1])

    # ── Read: List ──────────────────────────────────────────────

    async def list_by_author(self, db, author_id: str,
                              limit: int = 50) -> list[dict]:
        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c LEFT JOIN users u ON c.author_id = u.id
            WHERE c.author_id = ?
            ORDER BY c.created_at DESC LIMIT ?
            """,
            (author_id, limit),
        )
        rows = await cursor.fetchall()
        return [self._format_capsule(dict(r)) for r in rows]

    async def list_by_ids(self, db, capsule_ids: list[str],
                           order_preserve: bool = True) -> list[dict]:
        """Fetch capsules by ID list. Returns in the same order if order_preserve=True."""
        if not capsule_ids:
            return []
        placeholders = ",".join(["?" for _ in capsule_ids])
        cursor = await db.execute(
            f"""
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c LEFT JOIN users u ON c.author_id = u.id
            WHERE c.id IN ({placeholders})
            """,
            capsule_ids,
        )
        rows = await cursor.fetchall()
        capsule_map = {r["id"]: self._format_capsule(dict(r)) for r in rows}
        if order_preserve:
            return [capsule_map[cid] for cid in capsule_ids if cid in capsule_map]
        return list(capsule_map.values())

    async def list_highly_rated(self, db, limit: int = 50,
                                 current_time: str = "") -> list[dict]:
        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c LEFT JOIN users u ON c.author_id = u.id
            WHERE c.visibility = 'public'
            AND (c.unlock_at IS NULL OR c.unlock_at <= ?)
            AND c.emotion_intensity IS NOT NULL AND c.open_count > 0
            ORDER BY c.open_count DESC, c.emotion_intensity DESC LIMIT ?
            """,
            (current_time, limit),
        )
        rows = await cursor.fetchall()
        return [self._format_capsule(dict(r)) for r in rows]

    async def list_public(self, db, limit: int = 50,
                           current_time: str = "") -> list[dict]:
        cursor = await db.execute(
            """
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM capsules c LEFT JOIN users u ON c.author_id = u.id
            WHERE c.visibility = 'public'
            AND (c.unlock_at IS NULL OR c.unlock_at <= ?)
            ORDER BY c.created_at DESC LIMIT ?
            """,
            (current_time, limit),
        )
        rows = await cursor.fetchall()
        return [self._format_capsule(dict(r)) for r in rows]

    # ── Update ──────────────────────────────────────────────────

    async def increment_open_count(self, db, capsule_id: str):
        await db.execute(
            "UPDATE capsules SET open_count = open_count + 1 WHERE id = ?",
            (capsule_id,),
        )
        await db.commit()

    async def update_share_token(self, db, capsule_id: str,
                                  new_token: str) -> str:
        await db.execute(
            "UPDATE capsules SET share_token = ? WHERE id = ?",
            (new_token, capsule_id),
        )
        await db.commit()
        return new_token

    async def check_exists(self, db, capsule_id: str) -> bool:
        cursor = await db.execute(
            "SELECT id FROM capsules WHERE id = ?", (capsule_id,)
        )
        return await cursor.fetchone() is not None

    # ── Media ───────────────────────────────────────────────────

    async def get_media_for_capsule(self, db, capsule_id: str) -> list[dict]:
        cursor = await db.execute(
            "SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order",
            (capsule_id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def get_media_batch(self, db,
                               capsule_ids: list[str]) -> dict[str, list[dict]]:
        return await batch_fetch_media(db, capsule_ids)

    # ── Helpers ─────────────────────────────────────────────────

    def _format_capsule(self, row: dict) -> dict:
        capsule = row.copy()
        for field in ("emotion_tags", "interest_tags"):
            val = capsule.get(field)
            if val and isinstance(val, str):
                try:
                    capsule[field] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    capsule[field] = []
        if capsule.get("author_name"):
            capsule["author"] = {
                "name": capsule.pop("author_name", ""),
                "avatar": capsule.pop("author_avatar", None),
            }
        return capsule
