"""
User management routes — thin delegation to UserService.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from ..models import UserCreate, UserUpdate, UserResponse
from ..services.user_service import user_service

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
