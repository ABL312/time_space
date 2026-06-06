# API 对接卡片 — 上传与 AI 端点

> Issue: [#38](https://github.com/ABL312/time_space/issues/38)
> Date: 2026-06-06

---

## 变更摘要

| 类型 | 端点/服务 | 变更 |
|------|-----------|------|
| 🔒 加固 | `POST /api/upload/photo` | Content-Length 预检 + 结构化错误码 |
| 🔒 加固 | `POST /api/upload/voice` | 结构化错误码 |
| ⏱️ 超时 | `POST /api/ai/voice-clone` | 新增 30s 超时 + asyncio.wait_for |
| ⏱️ 超时 | `POST /api/ai/scene` | 新增 10s 超时 + 10MB 图片限制 |
| 🗑️ 清理 | `voice_service.py` | 删除（同步 ElevenLabs，未被引用） |

---

## 上传端点

### `POST /api/upload/photo`

**请求**：`multipart/form-data`
| 字段 | 类型 | 限制 |
|------|------|------|
| `file` | binary | JPEG/PNG/WebP, ≤5MB |

**成功响应** (200)：
```json
{
  "url": "/uploads/photos/abc123.jpg",
  "thumbnail_url": "/uploads/thumbnails/thumb_abc123.jpg",
  "filename": "abc123.jpg"
}
```

**错误响应** (结构化)：

| HTTP | error code | 触发条件 |
|------|-----------|---------|
| 413 | `file_too_large` | 文件超过 5MB |
| 400 | `invalid_content_type` | MIME 类型非 image/jpeg, image/png, image/webp |
| 400 | `invalid_file_content` | Magic bytes 校验失败（文件内容与声明类型不符） |

```json
// 413 示例
{
  "detail": {
    "error": "file_too_large",
    "message": "Photo exceeds maximum size of 5 MB",
    "size_bytes": 6291456,
    "max_bytes": 5242880
  }
}

// 400 示例
{
  "detail": {
    "error": "invalid_content_type",
    "message": "Image type 'image/gif' not supported",
    "accepted_types": ["image/jpeg", "image/png", "image/webp"]
  }
}
```

### `POST /api/upload/voice`

**请求**：`multipart/form-data`
| 字段 | 类型 | 限制 |
|------|------|------|
| `file` | binary | webm/mpeg/mp4/ogg/wav, ≤10MB |

**成功响应** (200)：
```json
{
  "url": "/uploads/voices/def456.webm",
  "filename": "def456.webm"
}
```

**错误响应**：同上结构，`max_bytes` 为 10485760 (10MB)

---

## AI 端点超时与 Fallback 一览

| 端点 | 超时 | Fallback 策略 | 无 API Key 行为 |
|------|------|-------------|----------------|
| `POST /api/ai/analyze-emotion` | 3s | 中文关键词字典 | 直接走关键词 fallback |
| `GET /api/ai/location-context` | 5s (Nominatim) + 5s (GPT) | 模板化地点描述 + 默认情绪 | 走模板（Nominatim 免费，无需 key） |
| `POST /api/ai/scene` | **10s** (GPT-4o) | GPS 推断 → 默认场景 | GPS 推断或返回 "未知" 场景 |
| `POST /api/ai/voice-clone` | **30s** (ElevenLabs) | fallback.mp3 或错误提示 | 直接返回 fallback |

### `POST /api/ai/scene`

**新增安全限制**：
- 图片最大 10MB（超过直接走 fallback，不尝试 base64 编码）
- GPT-4o Vision 调用 10s 超时

**请求**：`multipart/form-data`
| 字段 | 类型 | 必填 |
|------|------|------|
| `image` | binary | ✅ |
| `latitude` | float | 否 |
| `longitude` | float | 否 |

**响应**：
```json
{
  "scene_type": "校园",
  "description": "阳光洒在梧桐大道上，年轻的身影匆匆而过",
  "atmosphere": "青春活力与怀旧氛围",
  "mood_match": ["青春", "怀旧", "友情"]
}
```

### `POST /api/ai/voice-clone`

**新增**：30s 全局超时

**请求**：`multipart/form-data`
| 字段 | 类型 | 必填 |
|------|------|------|
| `sample` | binary | ✅ |
| `text` | string | ✅ |

**响应**：
```json
{
  "voice_id": "temp_clone_abc12345",
  "audio_url": "/uploads/voice_clones/xyz789.mp3",
  "duration_seconds": 4.5
}
```

---

## 胶囊创建流程隔离

`POST /api/capsules` 主流程中的外部依赖隔离策略：

```
1. INSERT capsule          ← 必须成功
2. 照片上传+压缩 (Pillow)   ← 单张失败跳过，不阻塞整体
3. 语音上传               ← 失败跳过
4. COMMIT                  ← 必须成功
5. asyncio.create_task(    ← 异步后台，完全不阻塞响应
     _analyze_and_update_emotion()
   )
```

| 步骤 | 失败处理 | 影响 |
|------|---------|------|
| 照片处理 | `except HTTPException: continue` | 跳过该照片 |
| 语音上传 | `except HTTPException: pass` | 胶囊无语音 |
| 情感分析 | `except Exception: print(...)` | 后台静默失败，稍后可重试 |
| 数据库操作 | 抛出异常 | 整个请求失败 (500) |

**原则**：外部服务（AI、文件处理）失败不影响胶囊创建的核心流程。

---

## 错误码规范

所有上传/AI 端点的错误响应统一使用结构化 JSON：

```json
{
  "detail": {
    "error": "<error_code>",
    "message": "<human-readable>",
    "...": "<contextual fields>"
  }
}
```

| error_code | HTTP | 含义 |
|-----------|------|------|
| `file_too_large` | 413 | 文件超过大小限制 |
| `invalid_content_type` | 400 | MIME 类型不支持 |
| `invalid_file_content` | 400 | Magic bytes 不匹配 |
| (默认) | 500 | 未预期错误（fallback 兜底） |
