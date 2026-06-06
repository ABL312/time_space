"""
User service — business logic layer for user operations.
Manages DB connections and delegates to UserRepository.
"""
from ..database import get_db
from ..repositories.user_repository import UserRepository

_repo = UserRepository()


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


# Singleton
user_service = UserService()
