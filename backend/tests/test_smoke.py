"""
Smoke tests — verify health, basic CRUD, and error handling.
Run: pytest tests/ -v
"""
import io


def test_health(client):
    """Health endpoint returns 200 with required fields."""
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "database" in data
    assert "media" in data
    assert "config" in data


def test_create_user(client):
    """Create a user and verify response."""
    r = client.post("/api/users", json={
        "name": "测试用户",
        "interest_tags": ["校园", "音乐", "旅行"]
    })
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "测试用户"
    assert len(data["interest_tags"]) == 3
    assert "id" in data


def test_get_user_not_found(client):
    """Non-existent user returns 404."""
    r = client.get("/api/users/nonexistent")
    assert r.status_code == 404


def test_create_capsule(client):
    """Create a simple capsule."""
    r = client.post("/api/capsules", data={
        "message": "这是一条测试时空留言，记录今天的校园回忆",
        "latitude": 31.23,
        "longitude": 121.47,
        "visibility": "public",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["message"] == "这是一条测试时空留言，记录今天的校园回忆"
    assert data["latitude"] == 31.23
    assert "id" in data


def test_create_capsule_short_message(client):
    """Message too short returns validation error."""
    r = client.post("/api/capsules", data={
        "message": "短",
        "latitude": 31.23,
        "longitude": 121.47,
    })
    assert r.status_code == 422  # FastAPI validation error


def test_nearby(client):
    """Nearby endpoint works."""
    r = client.get("/api/capsules/nearby?lat=31.23&lng=121.47&radius=5000")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "recommended" in data


def test_daily_recommend_empty(client):
    """Daily recommend with no capsules returns 404."""
    r = client.get("/api/capsules/daily-recommend")
    # May be 404 if no capsules, or 200 with fallback
    assert r.status_code in (200, 404)


def test_upload_invalid_type(client):
    """Upload of invalid file type returns 400."""
    files = {"file": ("test.gif", io.BytesIO(b"GIF89a\x00\x01\x00\x01\x00"), "image/gif")}
    r = client.post("/api/upload/photo", files=files)
    assert r.status_code == 400
    data = r.json()
    assert "detail" in data


def test_upload_oversized(client):
    """Upload of oversized file returns 413."""
    fake_jpeg = b"\xff\xd8\xff" + b"\x00" * 100
    headers = {"content-length": str(6 * 1024 * 1024)}
    files = {"file": ("big.jpg", io.BytesIO(fake_jpeg), "image/jpeg", headers)}
    r = client.post("/api/upload/photo", files=files)
    assert r.status_code == 413


def test_ai_emotion_fallback(client):
    """Emotion analysis works without API key (keyword fallback)."""
    r = client.post("/api/ai/analyze-emotion", json={
        "message": "怀念那些青春的校园时光"
    })
    assert r.status_code == 200
    data = r.json()
    assert len(data["emotions"]) >= 2
    assert data["sentiment"] in ("positive", "negative", "neutral")


def test_ai_location_context(client):
    """Location context returns valid response."""
    r = client.get("/api/ai/location-context?lat=31.23&lng=121.47")
    assert r.status_code == 200
    data = r.json()
    assert "name" in data
    assert "description" in data


def test_ai_scene_fallback(client):
    """Scene recognition returns fallback without API key."""
    jpeg_bytes = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09"
        b"\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f"
        b"\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37"
        b"\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34"
        b"\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00"
        b"\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00"
        b"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10"
        b"\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01\x7d"
        b"\xff\xd9"
    )
    files = {"image": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    r = client.post("/api/ai/scene", files=files, data={"latitude": 31.23, "longitude": 121.47})
    assert r.status_code == 200
    data = r.json()
    assert "scene_type" in data
    assert "mood_match" in data


def test_ai_voice_clone_fallback(client):
    """Voice clone returns fallback without API key."""
    files = {"sample": ("sample.webm", io.BytesIO(b"RIFF\x00\x00\x00\x00WEBPVP8"), "audio/webm")}
    data = {"text": "你好，这是时空信箱"}
    r = client.post("/api/ai/voice-clone", files=files, data=data)
    assert r.status_code == 200
    result = r.json()
    assert "voice_id" in result
