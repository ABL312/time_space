"""
Standalone file upload endpoints.

These endpoints allow uploading photos or voice files independently
of capsule creation — useful for pre-upload workflows in the frontend.
"""
from fastapi import APIRouter, UploadFile, File

from ..services.storage_service import storage_service

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/photo")
async def upload_photo(file: UploadFile = File(...)):
    """
    Upload a single photo file.

    Validates type (JPEG/PNG/WebP), checks magic bytes, compresses to
    max 1200px, generates a 200px thumbnail, and returns URLs.

    Returns:
        {"url": "...", "thumbnail_url": "...", "filename": "..."}

    Raises:
        400 – unsupported file type or magic bytes mismatch
        413 – file exceeds 5 MB limit
    """
    result = await storage_service.save_photo(file)
    return result


@router.post("/voice")
async def upload_voice(file: UploadFile = File(...)):
    """
    Upload a single voice recording.

    Validates type (webm/mpeg/mp4/ogg/wav) and size, then stores the file.

    Returns:
        {"url": "...", "filename": "..."}

    Raises:
        400 – unsupported audio type
        413 – file exceeds 10 MB limit
    """
    result = await storage_service.save_voice(file)
    return result
