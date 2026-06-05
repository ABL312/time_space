"""
User management routes.
"""
import uuid
import json
from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(data: UserCreate):
    """Create a new user profile."""
    user_id = str(uuid.uuid4())
    db = await get_db()
    try:
        await db.execute(
            """
            INSERT INTO users (id, name, interest_tags)
            VALUES (?, ?, ?)
            """,
            (user_id, data.name, json.dumps(data.interest_tags, ensure_ascii=False)),
        )
        await db.commit()

        return UserResponse(
            id=user_id,
            name=data.name,
            interest_tags=data.interest_tags,
            created_at="just now",
        )
    finally:
        await db.close()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        user = dict(row)
        interest_tags = json.loads(user["interest_tags"]) if user["interest_tags"] else []

        return UserResponse(
            id=user["id"],
            name=user["name"],
            avatar_url=user.get("avatar_url"),
            interest_tags=interest_tags,
            created_at=str(user["created_at"]),
        )
    finally:
        await db.close()


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate):
    """Update user profile."""
    db = await get_db()
    try:
        # Check user exists
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        user = dict(row)
        
        # Build update fields
        updates = []
        params = []
        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name)
            user["name"] = data.name
        if data.interest_tags is not None:
            updates.append("interest_tags = ?")
            params.append(json.dumps(data.interest_tags, ensure_ascii=False))
            user["interest_tags"] = json.dumps(data.interest_tags, ensure_ascii=False)
        if data.avatar_url is not None:
            updates.append("avatar_url = ?")
            params.append(data.avatar_url)
            user["avatar_url"] = data.avatar_url

        if updates:
            params.append(user_id)
            await db.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            await db.commit()

        interest_tags = json.loads(user["interest_tags"]) if isinstance(user["interest_tags"], str) else (user["interest_tags"] or [])

        return UserResponse(
            id=user["id"],
            name=user["name"],
            avatar_url=user.get("avatar_url"),
            interest_tags=interest_tags,
            created_at=str(user["created_at"]),
        )
    finally:
        await db.close()
