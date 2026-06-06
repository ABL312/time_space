"""Extended integration test — includes upload & AI endpoint validation."""
import asyncio
import sys
import io
sys.path.insert(0, ".")
sys.path.insert(0, "scripts")

from app.main import app
from app.database import init_db
from fastapi.testclient import TestClient


def main():
    asyncio.run(init_db())
    import seed_demo
    seed_demo.main()

    client = TestClient(app)
    passed = 0
    failed = 0

    def check(name, response, expected_status=200):
        nonlocal passed, failed
        ok = response.status_code == expected_status
        status = "✅" if ok else f"❌ [{response.status_code}]"
        print(f"{status} {name}")
        if not ok:
            failed += 1
            print(f"   Body: {response.text[:200]}")
        else:
            passed += 1
        return ok

    # ── Health ──────────────────────────────────────────────────
    r = client.get("/api/health")
    if check("Health check", r):
        data = r.json()
        assert "database" in data, "Health missing database status"
        assert "media" in data, "Health missing media status"
        assert "config" in data, "Health missing config status"
        print(f"   DB: {data['database']['status']}, caps={data['database']['capsules']}")

    # ── Capsule CRUD ────────────────────────────────────────────
    r = client.get("/api/capsules/mine?user_id=demo_graduate_xiaolin")
    if check("Mine capsules", r):
        data = r.json()
        print(f"   total={data['total']}, media={len(data['capsules'][0].get('media',[])) if data['capsules'] else 0}")

    r = client.get("/api/capsules/daily-recommend")
    check("Daily recommend", r)

    r = client.get("/api/capsules/nearby?lat=31.23&lng=121.47&radius=5000")
    check("Nearby", r)

    r = client.get("/api/capsules/search?q=青春")
    if check("Search", r):
        print(f"   results={r.json()['total']}")

    # ── Upload (valid JPEG) ─────────────────────────────────────
    # Create a minimal valid JPEG for testing
    jpeg_bytes = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09"
        b"\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f"
        b"\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37"
        b"\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34"
        b"\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00"
        b"\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00"
        b"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10"
        b"\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01\x7d\x01"
        b"\x02\x03\x00\x04\x11\x05\x12\x21\x31\x41\x06\x13\x51\x61\x07\x22\x71"
        b"\x14\x32\x81\x91\xa1\x08\x23\x42\xb1\xc1\x15\x52\xd1\xf0\x24\x33\x62"
        b"\x72\x82\x09\x0a\x16\x17\x18\x19\x1a\x25\x26\x27\x28\x29\x2a\x34\x35"
        b"\x36\x37\x38\x39\x3a\x43\x44\x45\x46\x47\x48\x49\x4a\x53\x54\x55\x56"
        b"\x57\x58\x59\x5a\x63\x64\x65\x66\x67\x68\x69\x6a\x73\x74\x75\x76\x77"
        b"\x78\x79\x7a\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97"
        b"\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6"
        b"\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5"
        b"\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2"
        b"\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00\x3f"
        b"\x00\xd2\xcf\xff\xd9"
    )
    files = {"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    r = client.post("/api/upload/photo", files=files)
    if check("Upload photo (valid JPEG)", r):
        data = r.json()
        assert "url" in data and "thumbnail_url" in data
        print(f"   url={data['url'][:40]}...")

    # ── Upload (invalid type) ────────────────────────────────────
    files = {"file": ("test.gif", io.BytesIO(b"GIF89a\x00\x01\x00\x01\x00"), "image/gif")}
    r = client.post("/api/upload/photo", files=files)
    check("Upload photo (invalid type → 400)", r, expected_status=400)

    # ── Upload (oversized → 413) ──────────────────────────────────
    # Send a file claiming to be 6MB via content-length header
    oversized = io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 100)
    headers = {"content-length": str(6 * 1024 * 1024)}
    files = {"file": ("big.jpg", oversized, "image/jpeg", headers)}
    r = client.post("/api/upload/photo", files=files)
    check("Upload photo (oversized → 413)", r, expected_status=413)

    # ── AI emotion (no API key → keyword fallback) ───────────────
    r = client.post("/api/ai/analyze-emotion", json={"message": "怀念那些青春的校园时光"})
    if check("AI emotion (keyword fallback)", r):
        data = r.json()
        assert len(data["emotions"]) >= 2, f"Expected >= 2 emotions, got {data['emotions']}"
        print(f"   emotions={data['emotions']}, sentiment={data['sentiment']}")

    # ── AI location context ─────────────────────────────────────
    r = client.get("/api/ai/location-context?lat=31.23&lng=121.47")
    check("AI location context", r)

    # ── AI scene (no API key → fallback) ─────────────────────────
    files = {"image": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    r = client.post("/api/ai/scene", files=files, data={"latitude": 31.23, "longitude": 121.47})
    if check("AI scene (fallback)", r):
        data = r.json()
        print(f"   scene_type={data['scene_type']}, mood_match={data['mood_match']}")

    # ── AI voice clone (no API key → fallback) ───────────────────
    files = {"sample": ("sample.webm", io.BytesIO(b"RIFF\x00\x00\x00\x00WEBPVP8"), "audio/webm")}
    data = {"text": "你好，这是时空信箱"}
    r = client.post("/api/ai/voice-clone", files=files, data=data)
    check("AI voice clone (fallback)", r)

    # ── Summary ──────────────────────────────────────────────────
    print()
    total = passed + failed
    if failed == 0:
        print(f"🎉 All {total} tests passed!")
    else:
        print(f"⚠️  {passed}/{total} passed, {failed} failed")


if __name__ == "__main__":
    main()
