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
