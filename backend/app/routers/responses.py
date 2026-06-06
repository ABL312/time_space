"""
Responses router — thin delegation to ResponseRepository.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import aiosqlite

from ..database import get_db
from ..models import ResponseModel, ResponseCreateModel
from ..repositories.response_repository import ResponseRepository

router = APIRouter(prefix="/api/capsules/{capsule_id}/responses", tags=["responses"])
_repo = ResponseRepository()


@router.post("/", response_model=ResponseModel, summary="Add a response to a capsule")
async def add_response(
    capsule_id: str,
    response_data: ResponseCreateModel,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Add a response to a specific capsule."""
    # Check capsule exists
    cursor = await db.execute("SELECT id FROM capsules WHERE id = ?", (capsule_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Capsule not found")

    response_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    await _repo.create(db, response_id, capsule_id,
                       response_data.user_id, response_data.nickname,
                       response_data.content, created_at)
    result = await _repo.get_by_id(db, response_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create response")
    return ResponseModel(**result)


@router.get("/", response_model=List[ResponseModel],
            summary="Get all responses for a capsule")
async def get_responses(
    capsule_id: str,
    offset: int = 0,
    limit: int = 50,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Get all responses for a specific capsule, with pagination."""
    cursor = await db.execute("SELECT id FROM capsules WHERE id = ?", (capsule_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Capsule not found")

    rows = await _repo.list_by_capsule(db, capsule_id, offset=offset, limit=limit)
    return [ResponseModel(**r) for r in rows]
