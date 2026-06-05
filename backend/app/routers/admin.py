"""
Admin routes for development and maintenance tasks.
"""
import os
from fastapi import APIRouter, HTTPException
from pathlib import Path
import sys

# Add the scripts directory and backend root to the path
# scripts/ is at project root (sibling of app/), and seed_demo needs to import from app/
_backend_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_backend_root / "scripts"))
sys.path.insert(0, str(_backend_root))

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Check if we're in development mode
IS_DEVELOPMENT = os.getenv("ENVIRONMENT", "production").lower() in ["development", "dev", "local"]


@router.post("/seed")
async def seed_demo_data():
    """Development only: seed demo capsules."""
    if not IS_DEVELOPMENT:
        raise HTTPException(status_code=403, detail="This endpoint is only available in development mode")
    
    try:
        # Import and run the seed function (scripts/ is at project root, added to sys.path above)
        import seed_demo
        seed_demo.main()
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