你是「时空信箱」项目的 backend-dev，现在执行 Phase 4 任务。

## 你的任务: AI 声音克隆服务 (Issue #13)

### 目标
后端实现 ElevenLabs 声音克隆：上传语音样本 → 克隆声音 → 用克隆声音朗读文字。

### 当前状态
先读取现有代码：
- backend/app/routers/ai.py（可能已有 voice-clone 骨架）
- backend/app/models.py
- backend/app/database.py（capsules 表有 voice_clone_url 字段）
- backend/app/main.py
- backend/requirements.txt

### 需要实现

1. **backend/app/services/voice_clone_service.py (新建)**

```python
class VoiceCloneService:
    """ElevenLabs voice cloning + TTS service."""
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY", "")
        # 如果没有 API key，使用 fallback
    
    async def clone_and_speak(self, sample_bytes: bytes, sample_filename: str, text: str) -> dict:
        """
        1. 用语音样本创建临时 voice
        2. 用该 voice 朗读 text
        3. 保存克隆语音到 data/uploads/voice_clones/
        4. 返回 { "voice_id": "...", "audio_url": "...", "duration_seconds": 3.5 }
        
        Fallback (无 API key 或失败):
        - 返回预生成的演示音频 URL
        - 或在 data/uploads/voice_clones/ 中放一个 fallback.mp3
        """
    
    async def _clone_with_elevenlabs(self, sample_bytes: bytes, sample_filename: str, text: str) -> dict:
        """
        ElevenLabs SDK 调用:
        1. client.voices.add(name="temp_clone", files=[sample]) → voice_id
        2. client.text_to_speech.convert(voice_id=voice_id, text=text, 
           model_id="eleven_multilingual_v2",
           voice_settings=VoiceSettings(stability=0.5, similarity_boost=0.8, style=0.3))
        3. 保存 MP3 到 data/uploads/voice_clones/{uuid}.mp3
        4. 删除临时 voice (可选，清理用)
        5. 返回 audio_url = /uploads/voice_clones/{uuid}.mp3
        """
    
    def _fallback_response(self) -> dict:
        """当 ElevenLabs 不可用时返回预生成音频。"""
        # 检查 data/uploads/voice_clones/ 下是否有预生成文件
        # 如果有，返回其 URL
        # 如果没有，创建一个简短的说明文件并返回
        return {
            "voice_id": "fallback",
            "audio_url": "/uploads/voice_clones/fallback.mp3",
            "duration_seconds": 0,
            "message": "声音克隆服务暂时不可用，请稍后再试"
        }
```

2. **修改 backend/app/routers/ai.py** — 完善 voice-clone 端点:

```python
@router.post("/voice-clone")
async def voice_clone(
    sample: UploadFile = File(...),  # 10s 音频样本
    text: str = Form(...),  # 要朗读的文字
):
    """
    克隆声音并朗读文字。
    - 格式: FormData
    - 字段: sample(音频文件), text(朗读文字)
    - Response 200: { "voice_id", "audio_url", "duration_seconds" }
    - Fallback: 返回预生成音频
    """
```

3. **准备 fallback 音频** — 确保有备用:
   - 在 data/uploads/voice_clones/ 创建一个简单的 fallback.mp3（或 .txt 说明文件）
   - 如果没有 ElevenLabs key，返回此 fallback URL 而非 500 错误

4. **更新 requirements.txt** — 如果需要:
   - elevenlabs SDK（检查是否已在 requirements.txt 中）
   - 如果不在，添加 `elevenlabs>=1.0.0`

### API 契约
POST /api/ai/voice-clone
- 格式: FormData
- 字段: sample(file, 10s 音频), text(string, 朗读文字)
- Response 200: { "voice_id": "xxx", "audio_url": "/uploads/voice_clones/xxx.mp3", "duration_seconds": 3.5 }
- 错误码: 400 → 文件格式错误, 500 → fallback 音频

### 技术要求
- 所有函数 async/await
- ElevenLabs SDK (elevenlabs Python 包)
- 10 秒超时
- 没有 ELEVENLABS_API_KEY 时必须有 fallback，不能 500
- Pydantic 做响应验证
- 克隆语音保存为 MP3 到 data/uploads/voice_clones/

### 重要提醒
- 如果遇到任何报错，**停下来告诉我**
- 如果需要其他队员的接口文档，**停下来问我**
- 如果 ElevenLabs SDK 版本和用法不确定，先读 requirements.txt 看当前版本

### 工作流
1. 读取现有 ai.py, models.py, requirements.txt, database.py
2. 创建 voice_clone_service.py
3. 修改 ai.py 完善 voice-clone 端点
4. 确保 fallback 机制工作
5. 更新 requirements.txt 如需
6. git add . && git commit -m "feat(backend): implement AI voice cloning service with ElevenLabs + fallback" (+ push if possible)
