"""
Admin routes for development and maintenance tasks.
"""
import os
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException

from ..config import config

# Add scripts path for seed_demo import
_backend_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_backend_root / "scripts"))
sys.path.insert(0, str(_backend_root))

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/seed")
async def seed_demo_data():
    """Development only: seed demo capsules."""
    if not config.is_development:
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only available in development mode")

    try:
        import seed_demo
        seed_demo.main()
        return {"message": "Demo data seeded successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to seed demo data: {str(e)}")


@router.get("/health")
async def admin_health_check():
    """Admin health check endpoint with config info."""
    return {
        "status": "ok",
        "service": "时空信箱 Admin API",
        "environment": config.environment,
        "config": config.summary(),
    }
