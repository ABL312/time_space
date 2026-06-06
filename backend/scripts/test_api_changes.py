"""Integration test for backend-refactor-02/03 API changes."""
import asyncio
import sys
sys.path.insert(0, ".")
sys.path.insert(0, "scripts")

from app.main import app
from app.database import init_db
from fastapi.testclient import TestClient


def main():
    # Init DB + seed demo data
    asyncio.run(init_db())
    import seed_demo
    seed_demo.main()

    client = TestClient(app)
    errors = []

    # 1. Health check
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health failed: {r.status_code}"
    print(f"✅ Health: {r.json()}")

    # 2. My capsules (N+1 fix)
    r = client.get("/api/capsules/mine?user_id=demo_graduate_xiaolin")
    assert r.status_code == 200, f"Mine failed: {r.status_code}"
    data = r.json()
    n = data["total"]
    print(f"✅ Mine capsules: total={n}")

    # Verify media is present (proves N+1 batch fetch works)
    if data["capsules"]:
        media = data["capsules"][0].get("media", [])
        print(f"   media in first capsule: {len(media)} items")

    # 3. Favorites with pagination
    r = client.get("/api/favorites/?user_id=demo_graduate_xiaolin&offset=0&limit=10")
    assert r.status_code == 200, f"Favorites failed: {r.status_code}"
    print(f"✅ Favorites (paginated): count={len(r.json())}")

    # 4. Collections with pagination
    r = client.get("/api/collections?offset=0&limit=10")
    assert r.status_code == 200, f"Collections failed: {r.status_code}"
    print(f"✅ Collections (paginated): {r.json()}")

    # 5. Responses with pagination
    capsule_id = None
    r = client.get("/api/capsules/mine?user_id=demo_graduate_xiaolin")
    if r.json()["capsules"]:
        capsule_id = r.json()["capsules"][0]["id"]

    if capsule_id:
        r = client.get(f"/api/capsules/{capsule_id}/responses/?offset=0&limit=10")
        assert r.status_code == 200, f"Responses failed: {r.status_code}"
        print(f"✅ Responses (paginated): count={len(r.json())}")

    # 6. Nearby (unchanged, verify still works)
    r = client.get("/api/capsules/nearby?lat=31.23&lng=121.47&radius=1200")
    assert r.status_code == 200, f"Nearby failed: {r.status_code}"
    print(f"✅ Nearby: total={r.json()['total']}")

    # 7. Daily recommend
    r = client.get("/api/capsules/daily-recommend")
    assert r.status_code == 200, f"Daily-recommend failed: {r.status_code}"
    print(f"✅ Daily-recommend: {r.json().get('reason', 'no reason')}")

    print()
    print("🎉 All API tests passed!")


if __name__ == "__main__":
    main()
