"""
Admin routes for development and maintenance tasks.
"""
import os
from fastapi import APIRouter, HTTPException
from pathlib import Path
import sys

# Add the scripts directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Check if we're in development mode
IS_DEVELOPMENT = os.getenv("ENVIRONMENT", "production").lower() in ["development", "dev", "local"]


@router.post("/seed")
async def seed_demo_data():
    """Development only: seed demo capsules."""
    if not IS_DEVELOPMENT:
        raise HTTPException(status_code=403, detail="This endpoint is only available in development mode")
    
    try:
        # Import and run the seed function
        from ..scripts.seed_demo import main
        main()
        return {"message": "Demo data seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed demo data: {str(e)}")


@router.get("/health")
async def admin_health_check():
    """Admin health check endpoint."""
    return {
        "status": "ok",
        "service": "时空信箱 Admin API",
        "environment": "development" if IS_DEVELOPMENT else "production",
    }