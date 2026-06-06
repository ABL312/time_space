"""
StorageService - File upload, validation, compression, and URL generation.

Handles photo uploads (with Pillow compression + thumbnail generation)
and voice file uploads (with type/size validation via magic bytes).
"""
import os
import uuid
import io
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

from ..config import config

# Try to import Pillow; fall back gracefully if unavailable.
try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False


class StorageService:
    """Centralized file upload service with validation and media processing."""

    def __init__(self):
        self._upload_dir = config.upload_dir
        self._max_photo_size = config.max_photo_size_mb * 1024 * 1024
        self._max_voice_size = config.max_voice_size_mb * 1024 * 1024

    MAX_PHOTO_LONG_EDGE = 1200              # px – compress target
    THUMBNAIL_SIZE = 200                    # px – thumbnail long edge
    JPEG_QUALITY = 85
    THUMBNAIL_QUALITY = 80

    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
    ALLOWED_VOICE_TYPES = {
        "audio/webm",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "audio/x-wav",
    }

    # Magic-byte signatures for image formats.
    # WebP: RIFF????WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
    IMAGE_MAGIC = [
        (b"\xff\xd8\xff", "jpeg"),
        (b"\x89PNG", "png"),
    ]
    # WebP needs special 12-byte check (RIFF at 0, WEBP at 8)

    # ---- public API ---------------------------------------------------------

    async def save_photo(self, file: UploadFile) -> dict:
        """
        Validate, compress, save a photo + its thumbnail.

        Returns:
            {
                "url": "/uploads/photos/<filename>",
                "thumbnail_url": "/uploads/thumbnails/<filename>",
                "filename": "<filename>",
            }

        Raises:
            HTTPException 400 – bad content type or magic bytes mismatch
            HTTPException 413 – file too large
        """
        # 0. Pre-check Content-Length header (avoid reading oversized files)
        content_length = file.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self._max_photo_size:
                    raise HTTPException(
                        status_code=413,
                        detail={
                            "error": "file_too_large",
                            "message": f"Photo exceeds maximum size of {config.max_photo_size_mb} MB",
                            "size_bytes": size,
                            "max_bytes": self._max_photo_size,
                        },
                    )
            except (ValueError, TypeError):
                pass  # Invalid content-length header, fall through to read-and-check

        content = await file.read()

        # 1. Size check (belt-and-suspenders with Content-Length pre-check)
        if len(content) > self._max_photo_size:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "file_too_large",
                    "message": f"Photo exceeds maximum size of {config.max_photo_size_mb} MB",
                    "size_bytes": len(content),
                    "max_bytes": self._max_photo_size,
                },
            )

        # 2. Content-type check
        content_type = (file.content_type or "").lower()
        if content_type not in self.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_content_type",
                    "message": f"Image type '{content_type}' not supported",
                    "accepted_types": sorted(self.ALLOWED_IMAGE_TYPES),
                },
            )

        # 3. Magic-bytes validation
        if not self._validate_image_magic(content):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_file_content",
                    "message": "File content does not match any supported image format",
                },
            )

        # 4. Generate unique filename
        filename = f"{uuid.uuid4().hex}.jpg"
        photo_path = self._upload_dir / "photos" / filename
        photo_path.parent.mkdir(parents=True, exist_ok=True)

        thumb_filename = f"thumb_{filename}"
        thumb_path = self._upload_dir / "thumbnails" / thumb_filename
        thumb_path.parent.mkdir(parents=True, exist_ok=True)

        # 5. Compress & save (with Pillow fallback)
        if PILLOW_AVAILABLE:
            try:
                img = Image.open(io.BytesIO(content))
                # Convert RGBA/P to RGB for JPEG output
                if img.mode in ("RGBA", "P", "LA"):
                    img = img.convert("RGB")

                # Resize long edge
                img.thumbnail(
                    (self.MAX_PHOTO_LONG_EDGE, self.MAX_PHOTO_LONG_EDGE),
                    Image.LANCZOS,
                )
                img.save(str(photo_path), "JPEG", quality=self.JPEG_QUALITY)

                # Thumbnail
                thumb = img.copy()
                thumb.thumbnail(
                    (self.THUMBNAIL_SIZE, self.THUMBNAIL_SIZE),
                    Image.LANCZOS,
                )
                thumb.save(str(thumb_path), "JPEG", quality=self.THUMBNAIL_QUALITY)
            except Exception:
                # Pillow failed (corrupt header etc.) – save raw bytes as fallback
                self._write_bytes(photo_path, content)
                self._write_bytes(thumb_path, content)
        else:
            # No Pillow – store raw file
            self._write_bytes(photo_path, content)
            # Thumbnail = same file (no Pillow to resize)
            self._write_bytes(thumb_path, content)

        return {
            "url": self.get_photo_url(filename),
            "thumbnail_url": self.get_thumbnail_url(thumb_filename),
            "filename": filename,
        }

    async def save_voice(self, file: UploadFile) -> dict:
        """
        Validate and save a voice recording.

        Returns:
            {
                "url": "/uploads/voices/<filename>",
                "filename": "<filename>",
            }

        Raises:
            HTTPException 400 – bad content type
            HTTPException 413 – file too large
        """
        content = await file.read()

        # 1. Size check
        if len(content) > self._max_voice_size:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "file_too_large",
                    "message": f"Voice file exceeds maximum size of {config.max_voice_size_mb} MB",
                    "size_bytes": len(content),
                    "max_bytes": self._max_voice_size,
                },
            )

        # 2. Content-type check
        content_type = (file.content_type or "").lower()
        if content_type not in self.ALLOWED_VOICE_TYPES:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_content_type",
                    "message": f"Voice type '{content_type}' not supported",
                    "accepted_types": sorted(self.ALLOWED_VOICE_TYPES),
                },
            )

        # 3. Determine extension from content type
        ext_map = {
            "audio/webm": "webm",
            "audio/mpeg": "mp3",
            "audio/mp4": "m4a",
            "audio/ogg": "ogg",
            "audio/wav": "wav",
            "audio/x-wav": "wav",
        }
        ext = ext_map.get(content_type, "webm")
        filename = f"{uuid.uuid4().hex}.{ext}"

        voice_path = self._upload_dir / "voices" / filename
        voice_path.parent.mkdir(parents=True, exist_ok=True)

        self._write_bytes(voice_path, content)

        return {
            "url": self.get_voice_url(filename),
            "filename": filename,
        }

    # ---- validation helpers -------------------------------------------------

    def _validate_image_magic(self, data: bytes) -> bool:
        """
        Check file magic bytes against known image signatures.

        Supports JPEG, PNG, and WebP (RIFF…WEBP).
        Returns True if the header matches any known image format.
        """
        if len(data) < 12:
            return False

        # JPEG: starts with FF D8 FF
        if data[:3] == b"\xff\xd8\xff":
            return True

        # PNG: starts with 89 50 4E 47
        if data[:4] == b"\x89PNG":
            return True

        # WebP: RIFF????WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
        if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            return True

        return False

    # ---- URL helpers (static) -----------------------------------------------

    @staticmethod
    def get_photo_url(filename: str) -> str:
        return f"/uploads/photos/{filename}"

    @staticmethod
    def get_thumbnail_url(filename: str) -> str:
        return f"/uploads/thumbnails/{filename}"

    @staticmethod
    def get_voice_url(filename: str) -> str:
        return f"/uploads/voices/{filename}"

    # ---- internal helpers ---------------------------------------------------

    @staticmethod
    def _write_bytes(path: Path, data: bytes) -> None:
        """Write raw bytes to a file, creating parent dirs if needed."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)


# Module-level singleton for convenience.
storage_service = StorageService()
