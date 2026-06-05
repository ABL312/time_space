"""
Debug script to test nearby API with detailed error handling
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.services.geohash_service import find_nearby_capsules
from backend.app.database import get_db
from backend.app.routers.capsules import _parse_capsule_row
from backend.app.models import CapsuleResponse
from backend.app.services.recommend_service import rank_capsules

async def debug_nearby_logic():
    """Debug the nearby API logic step by step"""
    lat, lng, radius = 31.0282, 121.4346, 5000
    
    print("=== Step 1: Testing database connection and find_nearby_capsules ===")
    db = await get_db()
    try:
        # Find nearby capsules
        capsules = await find_nearby_capsules(db, lat, lng, radius_m=radius)
        print(f"Found {len(capsules)} capsules")
        
        for i, capsule in enumerate(capsules):
            print(f"Capsule {i+1}:")
            print(f"  ID: {capsule.get('id')}")
            print(f"  Lat/Lng: {capsule.get('latitude')}, {capsule.get('longitude')}")
            print(f"  Geohash: {capsule.get('geohash')}")
            print(f"  Distance: {capsule.get('distance_m')}m")
            print(f"  Message: {capsule.get('message')}")
            
            # Try parsing
            try:
                parsed = _parse_capsule_row(capsule)
                print(f"  Parsed successfully")
            except Exception as e:
                print(f"  Parse error: {e}")
                
            # Try creating CapsuleResponse
            try:
                # Add missing required fields with default values
                parsed = _parse_capsule_row(capsule)
                if 'author_id' not in parsed:
                    parsed['author_id'] = ''
                if 'created_at' not in parsed:
                    parsed['created_at'] = '2026-01-01 00:00:00'
                    
                response = CapsuleResponse(
                    id=parsed["id"],
                    author_id=parsed.get("author_id", ""),
                    author=parsed.get("author"),
                    latitude=parsed["latitude"],
                    longitude=parsed["longitude"],
                    geohash=parsed["geohash"],
                    location_name=parsed.get("location_name"),
                    message=parsed["message"],
                    voice_url=parsed.get("voice_url"),
                    voice_clone_url=parsed.get("voice_clone_url"),
                    emotion_tags=parsed.get("emotion_tags"),
                    sentiment=parsed.get("sentiment"),
                    emotion_intensity=parsed.get("emotion_intensity"),
                    emotion_summary=parsed.get("emotion_summary"),
                    mood_tag=parsed.get("mood_tag"),
                    visibility=parsed.get("visibility", "public"),
                    open_count=parsed.get("open_count", 0),
                    created_at=str(parsed.get("created_at", "")),
                    media=parsed.get("media", []),
                    distance_m=parsed.get("distance_m"),
                    match_score=parsed.get("match_score"),
                    match_reasons=parsed.get("match_reasons"),
                )
                print(f"  CapsuleResponse created successfully")
            except Exception as e:
                print(f"  CapsuleResponse error: {e}")
                import traceback
                traceback.print_exc()
            
            print()
            
        print("=== Step 2: Testing recommendation ranking ===")
        try:
            recommended, others = rank_capsules(capsules, [], None, top_n=3)
            print(f"Ranked capsules - Recommended: {len(recommended)}, Others: {len(others)}")
        except Exception as e:
            print(f"Ranking error: {e}")
            import traceback
            traceback.print_exc()
            
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(debug_nearby_logic())