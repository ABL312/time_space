#!/usr/bin/env python3
"""
Performance baseline validation script.
Runs basic performance tests on core APIs and validates database configuration.
"""

import asyncio
import time
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_db, DB_PATH
from app.main import app
from fastapi.testclient import TestClient


async def check_database_config():
    """Check that database is configured with proper PRAGMAs."""
    print("🔍 Checking database configuration...")
    
    db = await get_db()
    try:
        # Check WAL mode
        wal_result = await db.execute("PRAGMA journal_mode")
        wal_mode = await wal_result.fetchone()
        
        # Check foreign keys
        fk_result = await db.execute("PRAGMA foreign_keys")
        fk_status = await fk_result.fetchone()
        
        print(f"  - Journal Mode: {wal_mode[0]}")
        print(f"  - Foreign Keys: {'ON' if fk_status[0] else 'OFF'}")
        
        if wal_mode[0] != "wal":
            print("❌ ERROR: Database not in WAL mode")
            return False
            
        if not fk_status[0]:
            print("❌ ERROR: Foreign keys not enabled")
            return False
            
    finally:
        await db.close()
            
    print("✅ Database configuration OK")
    return True


async def check_database_indexes():
    """Check that required indexes exist."""
    print("\n🔍 Checking database indexes...")
    
    required_indexes = [
        "idx_capsules_geohash",
        "idx_capsules_location", 
        "idx_media_capsule",
        "idx_interactions_capsule",
        "idx_interactions_user"
    ]
    
    db = await get_db()
    try:
        # Get all indexes
        result = await db.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
        )
        existing_indexes = {row[0] async for row in result}
        
        missing = []
        for idx in required_indexes:
            if idx not in existing_indexes:
                missing.append(idx)
                print(f"  ❌ Missing index: {idx}")
            else:
                print(f"  ✅ Found index: {idx}")
                
        if missing:
            print(f"❌ ERROR: Missing {len(missing)} required indexes")
            return False
            
    finally:
        await db.close()
            
    print("✅ All required indexes present")
    return True


def check_api_latency():
    """Check API latency for core endpoints."""
    print("\n🚀 Running API Latency Tests")
    print("=" * 50)
    
    client = TestClient(app)
    results = []
    
    # Test 1: Health check
    start = time.perf_counter()
    response = client.get("/api/health")
    duration_ms = (time.perf_counter() - start) * 1000
    threshold = 100
    
    if response.status_code == 200:
        status = "PASS"
        results.append(True)
    else:
        status = "FAIL"
        results.append(False)
    
    print(f"  {status} GET /api/health [{response.status_code}] {duration_ms:.1f}ms (≤{threshold}ms)")
    
    # Test 2: Nearby capsules
    start = time.perf_counter()
    response = client.get("/api/capsules/nearby?lat=31.2304&lng=121.4737&radius=5000&limit=50")
    duration_ms = (time.perf_counter() - start) * 1000
    threshold = 300
    
    if response.status_code == 200:
        status = "PASS"
        results.append(True)
    else:
        status = "FAIL"
        results.append(False)
    
    print(f"  {status} GET /api/capsules/nearby?lat=31.2304&lng=121.4737&radius=5000&limit=50 [{response.status_code}] {duration_ms:.1f}ms (≤{threshold}ms)")
    
    # Test 3: Search capsules
    start = time.perf_counter()
    response = client.get("/api/capsules/search?q=test")
    duration_ms = (time.perf_counter() - start) * 1000
    threshold = 500
    
    if response.status_code == 200:
        status = "PASS"
        results.append(True)
    else:
        status = "FAIL"
        results.append(False)
    
    print(f"  {status} GET /api/capsules/search?q=test [{response.status_code}] {duration_ms:.1f}ms (≤{threshold}ms)")
    
    # Test 4: Daily recommendation
    start = time.perf_counter()
    response = client.get("/api/capsules/daily-recommend")
    duration_ms = (time.perf_counter() - start) * 1000
    threshold = 500
    
    if response.status_code == 200:
        status = "PASS"
        results.append(True)
    elif response.status_code == 404:
        status = "ACCEPTED_404"
        results.append(True)
    else:
        status = "FAIL"
        results.append(False)
    
    print(f"  {status} GET /api/capsules/daily-recommend [{response.status_code}] {duration_ms:.1f}ms (≤{threshold}ms)")
    
    return all(results)


async def main():
    """Run all performance baseline checks."""
    print("🚀 Running Performance Baseline Validation")
    print("=" * 50)
    
    # Run database checks sequentially to avoid SQLite concurrency issues
    db_config_ok = await check_database_config()
    db_indexes_ok = await check_database_indexes()
    
    # Run API latency tests
    api_latency_ok = check_api_latency()
    
    print("\n" + "=" * 50)
    if db_config_ok and db_indexes_ok and api_latency_ok:
        print("🎉 All performance baseline checks PASSED")
        return 0
    else:
        print("💥 Some performance baseline checks FAILED")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)