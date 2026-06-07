"""
Collection routes for managing capsule collections and storylines.
"""
import uuid
import json
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Form, Depends

import aiosqlite
from ..database import get_db
from ..models import CapsuleResponse
from ..services.geohash_service import encode
from ..auth import get_current_user

router = APIRouter(prefix="/api/collections", tags=["collections"])


def _parse_collection_row(row: dict) -> dict:
    """Convert a raw DB row to a collection dict with parsed JSON fields."""
    collection = dict(row)
    
    # Parse JSON fields
    val = collection.get("capsule_ids")
    if val and isinstance(val, str):
        try:
            collection["capsule_ids"] = json.loads(val)
        except (json.JSONDecodeError, TypeError):
            collection["capsule_ids"] = []
            
    return collection


@router.get("")
async def get_collections(db: aiosqlite.Connection = Depends(get_db)):
    """Get list of collections."""
    try:
        cursor = await db.execute(
            """
            SELECT *
            FROM collections
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        rows = await cursor.fetchall()
        
        collections = [_parse_collection_row(dict(row)) for row in rows]
        return {"collections": collections, "total": len(collections)}
        
    finally:
        await db.close()


@router.post("", status_code=201)
async def create_collection(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    cover_image: Optional[str] = Form(None),
    capsule_ids: str = Form(...),  # JSON array string
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Create a new collection."""
    collection_id = str(uuid.uuid4())
    creator_id = current_user["id"]
    
    # Parse capsule_ids
    try:
        capsule_ids_list = json.loads(capsule_ids)
        if not isinstance(capsule_ids_list, list):
            raise ValueError("capsule_ids must be a JSON array")
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid capsule_ids format: {str(e)}")
    try:
        await db.execute(
            """
            INSERT INTO collections (id, title, description, cover_image, creator_id, capsule_ids)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (collection_id, title, description, cover_image, creator_id, json.dumps(capsule_ids_list, ensure_ascii=False)),
        )
        await db.commit()
        
        # Fetch and return the created collection
        cursor = await db.execute(
            "SELECT * FROM collections WHERE id = ?", (collection_id,)
        )
        row = await cursor.fetchone()
        collection = _parse_collection_row(dict(row))
        
        return collection
        
    finally:
        await db.close()


@router.get("/{collection_id}")
async def get_collection(collection_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Get collection detail by ID, including capsule list."""
    try:
        # Fetch collection
        cursor = await db.execute(
            "SELECT * FROM collections WHERE id = ?", (collection_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Collection not found")
            
        collection = _parse_collection_row(dict(row))
        
        # Fetch capsules in the collection
        capsule_ids = collection.get("capsule_ids", [])
        capsules = []
        
        if capsule_ids:
            # Create placeholders for the IN clause
            placeholders = ",".join("?" * len(capsule_ids))
            query = f"""
                SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
                FROM capsules c
                LEFT JOIN users u ON c.author_id = u.id
                WHERE c.id IN ({placeholders})
                AND (c.unlock_at IS NULL OR c.unlock_at <= ?)
                ORDER BY CASE c.id
            """
            
            # Add ordering based on collection order
            for i, cid in enumerate(capsule_ids):
                query += f" WHEN '{cid}' THEN {i}"
            query += " END"
            
            cursor = await db.execute(query, capsule_ids + [datetime.utcnow().isoformat()])
            rows = await cursor.fetchall()
            
            # Preserve collection order
            capsule_dict = {row["id"]: row for row in rows}
            ordered_rows = [capsule_dict[cid] for cid in capsule_ids if cid in capsule_dict]
            
            # Parse capsules
            from ..routers.capsules import _parse_capsule_row
            
            for row in ordered_rows:
                capsule = _parse_capsule_row(dict(row))
                
                # Fetch media
                media_cursor = await db.execute(
                    "SELECT * FROM media WHERE capsule_id = ? ORDER BY sort_order",
                    (capsule["id"],),
                )
                media_rows = await media_cursor.fetchall()
                capsule["media"] = [dict(m) for m in media_rows]
                
                capsules.append(capsule)
        
        collection["capsules"] = capsules
        return collection
        
    finally:
        await db.close()


@router.put("/{collection_id}")
async def update_collection(
    collection_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    cover_image: Optional[str] = Form(None),
    capsule_ids: Optional[str] = Form(None),  # JSON array string
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Update collection."""
    try:
        # Check if collection exists and user is creator
        cursor = await db.execute(
            "SELECT id, creator_id FROM collections WHERE id = ?", (collection_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Collection not found")
            
        if row["creator_id"] and row["creator_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Only the creator can update this collection")
        
        # Build update query dynamically
        updates = []
        params = []
        
        if title is not None:
            updates.append("title = ?")
            params.append(title)
            
        if description is not None:
            updates.append("description = ?")
            params.append(description)
            
        if cover_image is not None:
            updates.append("cover_image = ?")
            params.append(cover_image)
            
        if capsule_ids is not None:
            # Parse capsule_ids
            try:
                capsule_ids_list = json.loads(capsule_ids)
                if not isinstance(capsule_ids_list, list):
                    raise ValueError("capsule_ids must be a JSON array")
            except (json.JSONDecodeError, TypeError, ValueError) as e:
                raise HTTPException(status_code=400, detail=f"Invalid capsule_ids format: {str(e)}")
                
            updates.append("capsule_ids = ?")
            params.append(json.dumps(capsule_ids_list, ensure_ascii=False))
        
        if not updates:
            raise HTTPException(status_code=400, detail="No update data provided")
            
        params.append(collection_id)
        
        query = f"UPDATE collections SET {', '.join(updates)} WHERE id = ?"
        await db.execute(query, params)
        await db.commit()
        
        # Fetch and return the updated collection
        cursor = await db.execute(
            "SELECT * FROM collections WHERE id = ?", (collection_id,)
        )
        row = await cursor.fetchone()
        collection = _parse_collection_row(dict(row))
        
        return collection
        
    finally:
        await db.close()


@router.post("/{collection_id}/view")
async def increment_collection_views(collection_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Increment collection view count."""
    try:
        # Check if collection exists
        cursor = await db.execute(
            "SELECT id, view_count FROM collections WHERE id = ?", (collection_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Collection not found")
            
        # Increment view count
        new_view_count = row["view_count"] + 1
        await db.execute(
            "UPDATE collections SET view_count = ? WHERE id = ?",
            (new_view_count, collection_id),
        )
        await db.commit()
        
        return {"view_count": new_view_count}
        
    finally:
        await db.close()