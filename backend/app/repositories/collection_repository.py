"""
Collection repository — database operations for the collections table.
"""
import json
from typing import Optional


class CollectionRepository:
    """Data access for collections."""

    async def create(self, db, collection_id: str, title: str,
                     description: Optional[str], cover_image: Optional[str],
                     creator_id: Optional[str],
                     capsule_ids: list[str]) -> str:
        await db.execute(
            """INSERT INTO collections (id, title, description, cover_image, creator_id, capsule_ids)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (collection_id, title, description, cover_image, creator_id,
             json.dumps(capsule_ids, ensure_ascii=False)),
        )
        await db.commit()
        return collection_id

    async def get_by_id(self, db, collection_id: str) -> Optional[dict]:
        cursor = await db.execute(
            "SELECT * FROM collections WHERE id = ?", (collection_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return self._format(dict(row))

    async def list_all(self, db, offset: int = 0,
                        limit: int = 50) -> list[dict]:
        cursor = await db.execute(
            "SELECT * FROM collections ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        rows = await cursor.fetchall()
        return [self._format(dict(r)) for r in rows]

    async def update(self, db, collection_id: str, **fields) -> Optional[dict]:
        collection = await self.get_by_id(db, collection_id)
        if not collection:
            return None

        updates = []
        params = []
        for key, value in fields.items():
            if value is not None:
                if key == "capsule_ids":
                    value = json.dumps(value, ensure_ascii=False)
                updates.append(f"{key} = ?")
                params.append(value)

        if not updates:
            return collection

        params.append(collection_id)
        await db.execute(
            f"UPDATE collections SET {', '.join(updates)} WHERE id = ?",
            params,
        )
        await db.commit()
        return await self.get_by_id(db, collection_id)

    async def increment_views(self, db, collection_id: str) -> Optional[int]:
        cursor = await db.execute(
            "SELECT id, view_count FROM collections WHERE id = ?",
            (collection_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        new_count = row["view_count"] + 1
        await db.execute(
            "UPDATE collections SET view_count = ? WHERE id = ?",
            (new_count, collection_id),
        )
        await db.commit()
        return new_count

    async def check_exists(self, db, collection_id: str) -> bool:
        cursor = await db.execute(
            "SELECT id FROM collections WHERE id = ?", (collection_id,)
        )
        return await cursor.fetchone() is not None

    def _format(self, row: dict) -> dict:
        val = row.get("capsule_ids")
        if val and isinstance(val, str):
            try:
                row["capsule_ids"] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                row["capsule_ids"] = []
        return row
