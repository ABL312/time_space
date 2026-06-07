"""
Responses router for Time-Space Mailbox.
Handles adding and retrieving capsule responses.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import aiosqlite
import uuid
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import ResponseModel, ResponseCreateModel
from ..auth import get_current_user

router = APIRouter(prefix="/api/capsules/{capsule_id}/responses", tags=["responses"])

@router.post("/", response_model=ResponseModel, summary="Add a response to a capsule")
async def add_response(
    capsule_id: str,
    response_data: ResponseCreateModel,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Add a response to a specific capsule."""
    # Check if capsule exists
    async with db.execute(
        "SELECT id FROM capsules WHERE id = ?", (capsule_id,)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Capsule not found")
    
    # Create response
    response_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    
    await db.execute(
        """
        INSERT INTO responses (id, capsule_id, user_id, nickname, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            response_id,
            capsule_id,
            current_user["id"],
            response_data.nickname,
            response_data.content,
            created_at
        )
    )
    await db.commit()
    
    # Return created response
    async with db.execute(
        "SELECT * FROM responses WHERE id = ?", (response_id,)
    ) as cursor:
        row = await cursor.fetchone()
        if row:
            return ResponseModel(
                id=row[0],
                capsule_id=row[1],
                user_id=row[2],
                nickname=row[3],
                content=row[4],
                created_at=row[5]
            )
    
    raise HTTPException(status_code=500, detail="Failed to create response")

@router.get("/", response_model=List[ResponseModel], summary="Get all responses for a capsule")
async def get_responses(
    capsule_id: str,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get all responses for a specific capsule."""
    # Check if capsule exists
    async with db.execute(
        "SELECT id FROM capsules WHERE id = ?", (capsule_id,)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Capsule not found")
    
    # Get responses
    responses = []
    async with db.execute(
        """
        SELECT id, capsule_id, user_id, nickname, content, created_at 
        FROM responses 
        WHERE capsule_id = ? 
        ORDER BY created_at ASC
        """,
        (capsule_id,)
    ) as cursor:
        async for row in cursor:
            responses.append(ResponseModel(
                id=row[0],
                capsule_id=row[1],
                user_id=row[2],
                nickname=row[3],
                content=row[4],
                created_at=row[5]
            ))
    
    return responses