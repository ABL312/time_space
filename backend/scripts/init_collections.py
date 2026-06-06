"""
Script to initialize example collections for the Time-Space Mailbox.
"""
import asyncio
import json
import aiosqlite
from pathlib import Path
import sys
import os

# Add the app directory to the path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database import DB_PATH


async def create_example_collections():
    """Create example collections for demonstration."""
    # Connect to database
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    try:
        # Check if collections table exists
        cursor = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='collections'"
        )
        if not await cursor.fetchone():
            print("❌ Collections table does not exist. Run the app first to initialize the database.")
            return

        # Check if we already have collections
        cursor = await db.execute("SELECT COUNT(*) as count FROM collections")
        row = await cursor.fetchone()
        if row and row['count'] > 0:
            print("ℹ️  Collections already exist, skipping initialization.")
            return

        # Create "校园四景" collection
        campus_collection_id = "campus-scenes-001"
        campus_capsule_ids = [
            "campus-001", "campus-002", "campus-003", "campus-004"
        ]
        
        await db.execute(
            """
            INSERT INTO collections (id, title, description, creator_id, capsule_ids)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                campus_collection_id,
                "校园四景",
                "四个关于校园美好时光的胶囊，带你重温那些青春岁月",
                "admin",
                json.dumps(campus_capsule_ids, ensure_ascii=False)
            )
        )

        # Create "爱情故事线" collection
        love_collection_id = "love-storyline-001"
        love_capsule_ids = [
            "love-001", "love-002", "love-003"
        ]
        
        await db.execute(
            """
            INSERT INTO collections (id, title, description, creator_id, capsule_ids)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                love_collection_id,
                "爱情故事线",
                "一段关于初恋的美好回忆，三个时间节点的情感记录",
                "admin",
                json.dumps(love_capsule_ids, ensure_ascii=False)
            )
        )

        await db.commit()
        print("✅ Created example collections:")
        print("  - 校园四景 (4 capsules)")
        print("  - 爱情故事线 (3 capsules)")

    except Exception as e:
        print(f"❌ Error creating example collections: {e}")
        await db.rollback()
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(create_example_collections())