"""
User management routes — thin delegation to UserService.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
import aiosqlite

from ..models import UserCreate, UserUpdate, UserResponse, CapsuleResponse
from ..services.user_service import user_service
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(data: UserCreate):
    """Create a new user profile."""
    user = await user_service.create_user(data.name, data.interest_tags)
    return UserResponse(
        id=user["id"],
        name=user["name"],
        interest_tags=user["interest_tags"],
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID."""
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user["id"],
        name=user["name"],
        avatar_url=user.get("avatar_url"),
        interest_tags=user["interest_tags"],
        created_at=str(user.get("created_at", "")),
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate):
    """Update user profile."""
    fields = {}
    if data.name is not None:
        fields["name"] = data.name
    if data.interest_tags is not None:
        fields["interest_tags"] = data.interest_tags
    if data.avatar_url is not None:
        fields["avatar_url"] = data.avatar_url

    user = await user_service.update_user(user_id, **fields)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user["id"],
        name=user["name"],
        avatar_url=user.get("avatar_url"),
        interest_tags=user.get("interest_tags", []),
        created_at=str(user.get("created_at", "")),
    )


@router.get("/{user_id}/stats", summary="Get user statistics")
async def get_user_stats(
    user_id: str,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Get aggregated statistics for a user."""
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Count capsules created by user
    cursor = await db.execute(
        "SELECT COUNT(*) FROM capsules WHERE author_id = ?", (user_id,)
    )
    created_count = (await cursor.fetchone())[0]

    # Count interactions (opens) by user
    cursor = await db.execute(
        "SELECT COUNT(*) FROM interactions WHERE user_id = ? AND action = 'open'",
        (user_id,),
    )
    opened_count = (await cursor.fetchone())[0]

    # Count favorites by user
    cursor = await db.execute(
        "SELECT COUNT(*) FROM favorites WHERE user_id = ?", (user_id,)
    )
    favorited_count = (await cursor.fetchone())[0]

    # Total capsules in system
    cursor = await db.execute("SELECT COUNT(*) FROM capsules")
    total_capsules = (await cursor.fetchone())[0]

    # Recent opened capsules (last 5)
    cursor = await db.execute(
        """
        SELECT c.*, u.name as author_name
        FROM interactions i
        JOIN capsules c ON i.capsule_id = c.id
        LEFT JOIN users u ON c.author_id = u.id
        WHERE i.user_id = ? AND i.action = 'open'
        ORDER BY i.created_at DESC
        LIMIT 5
        """,
        (user_id,),
    )
    recent_opened_rows = await cursor.fetchall()
    recent_opened = []
    for row in recent_opened_rows:
        capsule_dict = dict(row)
        capsule_dict["emotion_tags"] = []  # Simplified for stats
        capsule_dict["media"] = []
        recent_opened.append(CapsuleResponse(**capsule_dict))

    # Recent created capsules (last 5)
    cursor = await db.execute(
        """
        SELECT c.*, u.name as author_name
        FROM capsules c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.author_id = ?
        ORDER BY c.created_at DESC
        LIMIT 5
        """,
        (user_id,),
    )
    recent_created_rows = await cursor.fetchall()
    recent_created = []
    for row in recent_created_rows:
        capsule_dict = dict(row)
        capsule_dict["emotion_tags"] = []
        capsule_dict["media"] = []
        recent_created.append(CapsuleResponse(**capsule_dict))

    return {
        "created_count": created_count,
        "opened_count": opened_count,
        "favorited_count": favorited_count,
        "total_capsules": total_capsules,
        "recent_opened": recent_opened,
        "recent_created": recent_created,
    }
