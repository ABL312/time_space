"""
Response repository — database operations for the responses table.
"""
from typing import Optional


class ResponseRepository:
    """Data access for capsule responses."""

    async def create(self, db, response_id: str, capsule_id: str,
                     user_id: Optional[str], nickname: str,
                     content: str, created_at: str) -> str:
        await db.execute(
            """INSERT INTO responses (id, capsule_id, user_id, nickname, content, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (response_id, capsule_id, user_id, nickname, content, created_at),
        )
        await db.commit()
        return response_id

    async def get_by_id(self, db, response_id: str) -> Optional[dict]:
        cursor = await db.execute(
            "SELECT id, capsule_id, user_id, nickname, content, created_at FROM responses WHERE id = ?",
            (response_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return self._format(row)

    async def list_by_capsule(self, db, capsule_id: str,
                               offset: int = 0, limit: int = 50) -> list[dict]:
        cursor = await db.execute(
            """SELECT id, capsule_id, user_id, nickname, content, created_at
               FROM responses WHERE capsule_id = ?
               ORDER BY created_at ASC LIMIT ? OFFSET ?""",
            (capsule_id, limit, offset),
        )
        rows = await cursor.fetchall()
        return [self._format(r) for r in rows]

    def _format(self, row) -> dict:
        return {
            "id": row[0],
            "capsule_id": row[1],
            "user_id": row[2],
            "nickname": row[3],
            "content": row[4],
            "created_at": row[5],
        }
