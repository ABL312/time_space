"""
Favorite repository — database operations for the favorites table.
"""
from typing import Optional


class FavoriteRepository:
    """Data access for user favorites."""

    async def add(self, db, favorite_id: str, user_id: str,
                  capsule_id: str, created_at: str):
        await db.execute(
            "INSERT INTO favorites (id, user_id, capsule_id, created_at) VALUES (?, ?, ?, ?)",
            (favorite_id, user_id, capsule_id, created_at),
        )
        await db.commit()

    async def remove(self, db, user_id: str, capsule_id: str) -> bool:
        cursor = await db.execute(
            "DELETE FROM favorites WHERE user_id = ? AND capsule_id = ?",
            (user_id, capsule_id),
        )
        await db.commit()
        return cursor.rowcount > 0

    async def check_exists(self, db, user_id: str, capsule_id: str) -> bool:
        cursor = await db.execute(
            "SELECT id FROM favorites WHERE user_id = ? AND capsule_id = ?",
            (user_id, capsule_id),
        )
        return await cursor.fetchone() is not None

    async def list_by_user(self, db, user_id: str,
                            offset: int = 0, limit: int = 50) -> list[dict]:
        """Return capsule dicts (not favorites rows) joined with capsules."""
        cursor = await db.execute(
            """SELECT c.id, c.author_id, c.latitude, c.longitude, c.geohash,
                      c.location_name, c.message, c.voice_url, c.voice_clone_url,
                      c.emotion_tags, c.sentiment, c.emotion_intensity, c.emotion_summary,
                      c.mood_tag, c.visibility, c.open_count, c.created_at
               FROM capsules c INNER JOIN favorites f ON c.id = f.capsule_id
               WHERE f.user_id = ?
               ORDER BY f.created_at DESC LIMIT ? OFFSET ?""",
            (user_id, limit, offset),
        )
        rows = await cursor.fetchall()
        return [self._format_capsule_row(r) for r in rows]

    def _format_capsule_row(self, row) -> dict:
        import json
        return {
            "id": row[0],
            "author_id": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "geohash": row[4],
            "location_name": row[5],
            "message": row[6],
            "voice_url": row[7],
            "voice_clone_url": row[8],
            "emotion_tags": json.loads(row[9]) if row[9] else None,
            "sentiment": row[10],
            "emotion_intensity": row[11],
            "emotion_summary": row[12],
            "mood_tag": row[13],
            "visibility": row[14],
            "open_count": row[15],
            "created_at": row[16],
            "media": [],
        }
