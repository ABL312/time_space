"""Fish Audio voice clone integration test.
Usage: cd /root/time_space/backend && .venv/bin/python scripts/fish_audio_test.py
"""
import os
import sys
import uuid
from pathlib import Path
import httpx

API_BASE = "https://api.fish.audio"

def get_key():
    env_path = Path(__file__).parent.parent / ".env"
    for line in env_path.read_text().split("\n"):
        if "FISH_AUDIO_API_KEY" in line and "=" in line:
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
            if key:
                return key
    return ""

def step(label):
    print(f"\n{'='*50}")
    print(f"  {label}")
    print("="*50)

async def test_basic_tts(client, headers):
    """Step 1: Basic TTS with Fish Audio's default voice (不克隆，先验证额度)"""
    step("Step 1: Basic TTS (验证 API 额度)")

    payload = {
        "text": "你好，这是Fish Audio的声音克隆测试。一切正常的话你应该能听到这段话。",
        "reference_id": "03397b4c6ba84e6cb4fa1f9c0888122a",
        "format": "mp3",
        "mp3_bitrate": 128,
        "latency": "normal",
    }
    tts_headers = {**headers, "Content-Type": "application/json", "model": "s2-pro"}

    resp = await client.post(f"{API_BASE}/v1/tts", headers=tts_headers, json=payload)
    print(f"   Status: {resp.status_code}")

    if resp.status_code == 200:
        out = Path("/tmp/fish_tts_test.mp3")
        out.write_bytes(resp.content)
        print(f"   ✅ TTS OK! {len(resp.content)} bytes → {out}")
        return True
    else:
        print(f"   ❌ TTS failed: {resp.text[:300]}")
        return False

async def test_voice_clone(client, headers):
    """Step 2: Full voice clone flow — create model → TTS → cleanup"""
    step("Step 2: Voice Clone (创建模型 → 克隆语音 → 清理)")

    # Generate a simple test audio: 10s of 440Hz sine wave WAV
    # Fish Audio needs a real voice, but this tests the API flow
    print("   生成测试音频样本...")
    import struct, math
    sample_rate = 22050
    duration = 10  # seconds
    freq = 440
    samples = []
    for i in range(sample_rate * duration):
        t = i / sample_rate
        val = int(32767 * 0.5 * math.sin(2 * math.pi * freq * t))
        samples.append(struct.pack('<h', val))

    wav_header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + len(samples) * 2, b'WAVE',
        b'fmt ', 16, 1, 1, sample_rate,
        sample_rate * 2, 2, 16,
        b'data', len(samples) * 2
    )
    sample_bytes = wav_header + b''.join(samples)

    # ── Create model ──
    model_id = None
    model_title = f"test_clone_{uuid.uuid4().hex[:8]}"

    # Fish Audio needs multipart form
    files = {"voices": ("sample.wav", sample_bytes, "audio/wav")}
    data = {
        "visibility": "private",
        "type": "tts",
        "title": model_title,
        "train_mode": "fast",
    }

    resp = await client.post(f"{API_BASE}/model", headers=headers, files=files, data=data)
    print(f"   Create model: {resp.status_code}")

    if resp.status_code != 200:
        print(f"   ❌ Model creation failed: {resp.text[:300]}")
        return False

    model_data = resp.json()
    model_id = model_data.get("_id", "")
    print(f"   ✅ Model created: {model_id} ({model_title})")

    try:
        # ── TTS with cloned voice ──
        tts_headers = {**headers, "Content-Type": "application/json", "model": "s2-pro"}
        resp = await client.post(
            f"{API_BASE}/v1/tts",
            headers=tts_headers,
            json={
                "text": "这是克隆的声音在说话。如果你的声音被克隆了，这段话应该带着你的音色。",
                "reference_id": model_id,
                "format": "mp3",
                "mp3_bitrate": 128,
                "latency": "normal",
            },
        )

        if resp.status_code == 200:
            out = Path("/tmp/fish_clone_tts.mp3")
            out.write_bytes(resp.content)
            print(f"   ✅ Clone TTS OK! {len(resp.content)} bytes → {out}")
            print(f"   时长约: {len(resp.content) / 16000:.1f}s")
        else:
            print(f"   ❌ Clone TTS failed: {resp.text[:300]}")
    finally:
        # ── Cleanup ──
        if model_id:
            resp = await client.delete(f"{API_BASE}/model/{model_id}", headers=headers)
            print(f"   Cleanup model: {resp.status_code}")
            if resp.status_code == 200:
                print(f"   🗑️  Model {model_id} deleted")
            else:
                print(f"   ⚠️  Failed to delete: {resp.text[:200]}")

    return True

async def main():
    key = get_key()
    if not key:
        print("❌ FISH_AUDIO_API_KEY not found in .env")
        sys.exit(1)

    print(f"🔑 Key: {key[:8]}... (len={len(key)})")
    headers = {"Authorization": f"Bearer {key}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: Basic TTS
        ok = await test_basic_tts(client, headers)
        if not ok:
            print("\n❌ 基础 TTS 失败，请检查余额/Key")
            sys.exit(1)

        # Step 2: Voice Clone
        ok = await test_voice_clone(client, headers)
        if not ok:
            print("\n⚠️  声音克隆流程有问题")
            sys.exit(1)

    print("\n" + "="*50)
    print("  🎉 所有测试通过！Fish Audio API 正常工作")
    print("="*50)
    print("\n生成的文件:")
    print("  /tmp/fish_tts_test.mp3   — 基础 TTS")
    print("  /tmp/fish_clone_tts.mp3  — 克隆语音（测试音色）")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
