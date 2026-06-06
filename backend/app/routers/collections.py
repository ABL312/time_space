"""
Collection routes — thin delegation to CollectionRepository.
"""
import uuid
import json
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Form

from ..database import get_db
from ..repositories.collection_repository import CollectionRepository
from ..repositories.capsule_repository import CapsuleRepository

router = APIRouter(prefix="/api/collections", tags=["collections"])
_repo = CollectionRepository()
_capsule_repo = CapsuleRepository()


@router.get("")
async def get_collections(offset: int = 0, limit: int = 50):
    """Get list of collections with pagination."""
    db = await get_db()
    try:
        collections = await _repo.list_all(db, offset=offset, limit=limit)
        return {"collections": collections, "total": len(collections)}
    finally:
        await db.close()


@router.post("", status_code=201)
async def create_collection(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    cover_image: Optional[str] = Form(None),
    creator_id: Optional[str] = Form(None),
    capsule_ids: str = Form(...),
):
    """Create a new collection."""
    try:
        capsule_ids_list = json.loads(capsule_ids)
        if not isinstance(capsule_ids_list, list):
            raise ValueError("capsule_ids must be a JSON array")
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        raise HTTPException(status_code=400,
                            detail=f"Invalid capsule_ids format: {str(e)}")

    collection_id = str(uuid.uuid4())
    db = await get_db()
    try:
        await _repo.create(db, collection_id, title, description,
                           cover_image, creator_id, capsule_ids_list)
        return await _repo.get_by_id(db, collection_id)
    finally:
        await db.close()


@router.get("/{collection_id}")
async def get_collection(collection_id: str):
    """Get collection detail by ID, including capsule list."""
    db = await get_db()
    try:
        collection = await _repo.get_by_id(db, collection_id)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

        capsule_ids = collection.get("capsule_ids", [])
        if capsule_ids:
            capsules = await _capsule_repo.list_by_ids(db, capsule_ids, order_preserve=True)
            parsed_ids = [c["id"] for c in capsules]
            media_map = await _capsule_repo.get_media_batch(db, parsed_ids)
            for c in capsules:
                c["media"] = media_map.get(c["id"], [])
            collection["capsules"] = capsules
        else:
            collection["capsules"] = []
        return collection
    finally:
        await db.close()


@router.put("/{collection_id}")
async def update_collection(
    collection_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    cover_image: Optional[str] = Form(None),
    capsule_ids: Optional[str] = Form(None),
):
    """Update collection."""
    fields = {}
    if title is not None:
        fields["title"] = title
    if description is not None:
        fields["description"] = description
    if cover_image is not None:
        fields["cover_image"] = cover_image
    if capsule_ids is not None:
        try:
            capsule_ids_list = json.loads(capsule_ids)
            if not isinstance(capsule_ids_list, list):
                raise ValueError("capsule_ids must be a JSON array")
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            raise HTTPException(status_code=400,
                                detail=f"Invalid capsule_ids format: {str(e)}")
        fields["capsule_ids"] = capsule_ids_list

    if not fields:
        raise HTTPException(status_code=400, detail="No update data provided")

    db = await get_db()
    try:
        result = await _repo.update(db, collection_id, **fields)
        if not result:
            raise HTTPException(status_code=404, detail="Collection not found")
        return result
    finally:
        await db.close()


@router.post("/{collection_id}/view")
async def increment_collection_views(collection_id: str):
    """Increment collection view count."""
    db = await get_db()
    try:
        new_count = await _repo.increment_views(db, collection_id)
        if new_count is None:
            raise HTTPException(status_code=404, detail="Collection not found")
        return {"view_count": new_count}
    finally:
        await db.close()
