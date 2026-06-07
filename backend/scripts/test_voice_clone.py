"""
Test script for /api/ai/voice-clone endpoint.
Tests both the fallback path (no API key) and the response format.

Usage:
    cd /root/time_space/backend
    .venv/bin/python scripts/test_voice_clone.py
"""
import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8000"


def test_voice_clone_fallback():
    """Test the voice-clone endpoint returns a valid fallback response."""
    print("🧪 Testing POST /api/ai/voice-clone (fallback mode)...")

    # Build a minimal multipart/form-data request
    boundary = "----TestBoundary12345"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="sample"; filename="test.webm"\r\n'
        f"Content-Type: audio/webm\r\n"
        f"\r\n"
        f"fake audio bytes for testing\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="text"\r\n'
        f"\r\n"
        f"你好，这是一段声音克隆测试文本。\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/ai/voice-clone",
        data=body,
        method="POST",
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            status = response.status
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        status = e.code
        data = json.loads(e.read().decode("utf-8"))
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

    print(f"   Status: {status}")
    print(f"   Response: {json.dumps(data, ensure_ascii=False, indent=2)}")

    # Validate response structure
    assert status == 200, f"Expected 200, got {status}"
    assert "voice_id" in data, "Missing voice_id in response"
    assert "audio_url" in data, "Missing audio_url in response"
    assert "duration_seconds" in data, "Missing duration_seconds in response"
    assert isinstance(data["duration_seconds"], (int, float)), "duration_seconds should be numeric"

    print(f"   voice_id: {data['voice_id']}")
    print(f"   audio_url: {data['audio_url']}")
    print(f"   duration: {data['duration_seconds']}s")

    if data.get("message"):
        print(f"   message: {data['message']}")

    # In fallback mode, voice_id should be 'fallback'
    if data["voice_id"] == "fallback":
        print("   ℹ️  Running in FALLBACK mode (no ElevenLabs API key configured)")
    else:
        print("   ✅ Running with REAL ElevenLabs API!")

    print("✅ POST /api/ai/voice-clone response is valid!")
    return True


def test_fallback_audio_accessible():
    """Test that the fallback audio file is accessible via static file server."""
    print("\n🧪 Testing fallback audio file accessibility...")

    url = f"{BASE_URL}/uploads/voice_clones/fallback.mp3"
    req = urllib.request.Request(url, method="HEAD")

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            content_length = response.headers.get("Content-Length", "unknown")
    except urllib.error.HTTPError as e:
        status = e.code
        content_length = "N/A"

    print(f"   GET {url} -> {status}")
    if status == 200:
        print(f"   Content-Length: {content_length} bytes")
        print("✅ Fallback audio file is accessible!")
        return True
    else:
        print(f"❌ Fallback audio file returned {status}")
        return False


def test_demo_audio_accessible():
    """Test that the demo audio file is accessible via static file server."""
    print("\n🧪 Testing demo audio file accessibility...")

    url = f"{BASE_URL}/uploads/voice_clones/demo.mp3"
    req = urllib.request.Request(url, method="HEAD")

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            content_length = response.headers.get("Content-Length", "unknown")
    except urllib.error.HTTPError as e:
        status = e.code
        content_length = "N/A"

    print(f"   GET {url} -> {status}")
    if status == 200:
        print(f"   Content-Length: {content_length} bytes")
        print("✅ Demo audio file is accessible!")
        return True
    else:
        print(f"⚠️ Demo audio file not found ({status}) - this is OK if using fallback.mp3")
        return True  # Non-critical


if __name__ == "__main__":
    print("=" * 60)
    print("  Voice Clone API Integration Test")
    print("=" * 60)
    print()

    all_pass = True
    all_pass = test_voice_clone_fallback() and all_pass
    all_pass = test_fallback_audio_accessible() and all_pass
    all_pass = test_demo_audio_accessible() and all_pass

    print()
    if all_pass:
        print("🎉 All voice clone tests passed!")
    else:
        print("❌ Some tests failed.")
        sys.exit(1)
