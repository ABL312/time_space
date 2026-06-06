"""
User service — business logic layer for user operations.
Manages DB connections and delegates to UserRepository.
"""
from fastapi import HTTPException

from ..database import get_db
from ..repositories.user_repository import UserRepository
from ..repositories.capsule_repository import CapsuleRepository

_repo = UserRepository()
_capsule_repo = CapsuleRepository()


class UserService:

    async def create_user(self, name: str, interest_tags: list[str]) -> dict:
        import uuid
        db = await get_db()
        try:
            return await _repo.create(db, str(uuid.uuid4()), name, interest_tags)
        finally:
            await db.close()

    async def get_user(self, user_id: str) -> dict | None:
        db = await get_db()
        try:
            return await _repo.get_by_id(db, user_id)
        finally:
            await db.close()

    async def update_user(self, user_id: str, **fields) -> dict | None:
        db = await get_db()
        try:
            return await _repo.update(db, user_id, **fields)
        finally:
            await db.close()

    async def get_user_stats(self, db, user_id: str) -> dict:
        """Get aggregated statistics for a user. Uses caller-provided db."""
        user = await _repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Count capsules created
        cursor = await db.execute(
            "SELECT COUNT(*) FROM capsules WHERE author_id = ?", (user_id,)
        )
        created_count = (await cursor.fetchone())[0]

        # Count interactions (opens)
        cursor = await db.execute(
            "SELECT COUNT(*) FROM interactions WHERE user_id = ? AND action = 'open'",
            (user_id,),
        )
        opened_count = (await cursor.fetchone())[0]

        # Count favorites
        cursor = await db.execute(
            "SELECT COUNT(*) FROM favorites WHERE user_id = ?", (user_id,)
        )
        favorited_count = (await cursor.fetchone())[0]

        # Total capsules in system
        cursor = await db.execute("SELECT COUNT(*) FROM capsules")
        total_capsules = (await cursor.fetchone())[0]

        # Recent opened (last 5)
        cursor = await db.execute(
            """SELECT c.*, u.name as author_name
               FROM interactions i JOIN capsules c ON i.capsule_id = c.id
               LEFT JOIN users u ON c.author_id = u.id
               WHERE i.user_id = ? AND i.action = 'open'
               ORDER BY i.created_at DESC LIMIT 5""",
            (user_id,),
        )
        recent_opened = [_capsule_repo._format_capsule(dict(r))
                         for r in await cursor.fetchall()]

        # Recent created (last 5)
        cursor = await db.execute(
            """SELECT c.*, u.name as author_name
               FROM capsules c LEFT JOIN users u ON c.author_id = u.id
               WHERE c.author_id = ?
               ORDER BY c.created_at DESC LIMIT 5""",
            (user_id,),
        )
        recent_created = [_capsule_repo._format_capsule(dict(r))
                          for r in await cursor.fetchall()]

        return {
            "created_count": created_count,
            "opened_count": opened_count,
            "favorited_count": favorited_count,
            "total_capsules": total_capsules,
            "recent_opened": recent_opened,
            "recent_created": recent_created,
        }


# Singleton
user_service = UserService()
