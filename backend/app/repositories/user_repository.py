"""
User repository — database operations for the users table.
"""
import json
from typing import Optional
from .base import parse_json_field


class UserRepository:
    """Data access for users."""

    # ── Create ──────────────────────────────────────────────────

    async def create(self, db, user_id: str, name: str,
                     interest_tags: list[str]) -> dict:
        await db.execute(
            "INSERT INTO users (id, name, interest_tags) VALUES (?, ?, ?)",
            (user_id, name, json.dumps(interest_tags, ensure_ascii=False)),
        )
        await db.commit()
        return {
            "id": user_id,
            "name": name,
            "interest_tags": interest_tags,
            "avatar_url": None,
            "created_at": None,
        }

    # ── Read ────────────────────────────────────────────────────

    async def get_by_id(self, db, user_id: str) -> Optional[dict]:
        cursor = await db.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return self._format_user(dict(row))

    async def get_interest_tags(self, db, user_id: str) -> list[str]:
        cursor = await db.execute(
            "SELECT interest_tags FROM users WHERE id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        if row and row[0]:
            tags = parse_json_field(row[0], [])
            return tags if isinstance(tags, list) else []
        return []

    # ── Stats ───────────────────────────────────────────────────

    async def get_stats(self, db, user_id: str) -> dict:
        """Return aggregated statistics for a user."""
        # Count capsules created
        cursor = await db.execute(
            "SELECT COUNT(*) FROM capsules WHERE author_id = ?", (user_id,))
        created_count = (await cursor.fetchone())[0]
        # Count opens
        cursor = await db.execute(
            "SELECT COUNT(*) FROM interactions WHERE user_id = ? AND action = 'open'", (user_id,))
        opened_count = (await cursor.fetchone())[0]
        # Count favorites
        cursor = await db.execute(
            "SELECT COUNT(*) FROM favorites WHERE user_id = ?", (user_id,))
        favorited_count = (await cursor.fetchone())[0]
        # Total capsules
        cursor = await db.execute("SELECT COUNT(*) FROM capsules")
        total_capsules = (await cursor.fetchone())[0]
        return {
            "created_count": created_count,
            "opened_count": opened_count,
            "favorited_count": favorited_count,
            "total_capsules": total_capsules,
        }

    async def get_recent_opened(self, db, user_id: str, limit: int = 5) -> list[dict]:
        cursor = await db.execute(
            """SELECT c.*, u.name as author_name
               FROM interactions i JOIN capsules c ON i.capsule_id = c.id
               LEFT JOIN users u ON c.author_id = u.id
               WHERE i.user_id = ? AND i.action = 'open'
               ORDER BY i.created_at DESC LIMIT ?""",
            (user_id, limit))
        return [dict(r) for r in await cursor.fetchall()]

    async def get_recent_created(self, db, user_id: str, limit: int = 5) -> list[dict]:
        cursor = await db.execute(
            """SELECT c.*, u.name as author_name
               FROM capsules c LEFT JOIN users u ON c.author_id = u.id
               WHERE c.author_id = ? ORDER BY c.created_at DESC LIMIT ?""",
            (user_id, limit))
        return [dict(r) for r in await cursor.fetchall()]

    # ── Update ──────────────────────────────────────────────────

    async def update(self, db, user_id: str, **fields) -> Optional[dict]:
        user = await self.get_by_id(db, user_id)
        if not user:
            return None

        updates = []
        params = []
        for key, value in fields.items():
            if value is not None:
                if key == "interest_tags":
                    value = json.dumps(value, ensure_ascii=False)
                updates.append(f"{key} = ?")
                params.append(value)

        if not updates:
            return user

        params.append(user_id)
        await db.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
            params,
        )
        await db.commit()
        return await self.get_by_id(db, user_id)

    # ── Helpers ─────────────────────────────────────────────────

    def _format_user(self, row: dict) -> dict:
        row["interest_tags"] = parse_json_field(row.get("interest_tags"), [])
        return row
