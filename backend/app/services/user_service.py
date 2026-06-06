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

        stats = await _repo.get_stats(db, user_id)

        # Recent opened
        recent_opened = []
        for row in await _repo.get_recent_opened(db, user_id):
            recent_opened.append(_capsule_repo._format_capsule(row))

        # Recent created
        recent_created = []
        for row in await _repo.get_recent_created(db, user_id):
            recent_created.append(_capsule_repo._format_capsule(row))

        return {**stats, "recent_opened": recent_opened,
                "recent_created": recent_created}


# Singleton
user_service = UserService()
