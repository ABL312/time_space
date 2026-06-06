# 部署文档 — 时空信箱 Backend

> Issue: [#37](https://github.com/ABL312/time_space/issues/37)
> Date: 2026-06-06

---

## 快速开始

### 1. 环境要求

- Python 3.10+
- pip

### 2. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，按需修改：

```bash
cp .env.example .env
```

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | 否 | `sqlite:///./data/timespace.db` | 数据库路径 |
| `UPLOAD_DIR` | 否 | `./data/uploads` | 文件上传目录 |
| `CORS_ORIGINS` | 否 | `http://localhost:5173` | 跨域来源（逗号分隔） |
| `ENVIRONMENT` | 否 | `production` | `development` / `production` |
| `OPENAI_API_KEY` | 否 | (空) | GPT 情感分析/场景识别（无 key 自动降级为关键词匹配） |
| `ELEVENLABS_API_KEY` | 否 | (空) | 语音克隆（无 key 返回 fallback） |
| `MAX_PHOTO_SIZE_MB` | 否 | `5` | 照片上传大小限制 (MB) |
| `MAX_VOICE_SIZE_MB` | 否 | `10` | 语音上传大小限制 (MB) |

**重要**：`OPENAI_API_KEY` 和 `ELEVENLABS_API_KEY` 均为可选。无 AI key 时：
- 情感分析 → 中文关键词字典匹配
- 场景识别 → GPS 位置推断
- 语音克隆 → 返回 fallback 提示
- **主流程（创建胶囊、查看胶囊）不受影响**

### 4. 启动服务

```bash
# 开发模式
ENVIRONMENT=development uvicorn app.main:app --reload --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 5. 验证

```bash
# 健康检查
curl http://localhost:8000/api/health

# 预期返回
{
  "status": "ok",
  "database": {"status": "connected", "capsules": 0, "users": 0},
  "media": {"photos_dir_exists": true, ...},
  "config": {"environment": "production", "ai_emotion_enabled": false, ...}
}
```

---

## 部署到 Railway

### 使用现有配置

项目已包含 `Procfile` 和 `railway.toml`：

```
Procfile:     web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
railway.toml: Nixpacks builder, health check at /api/health
```

### 环境变量设置

在 Railway Dashboard → Variables 中添加上述环境变量。

### 启动后验证

```bash
curl https://your-app.railway.app/api/health
```

---

## 本地开发

### 种子数据

```bash
ENVIRONMENT=development uvicorn app.main:app --reload --port 8000

# 另一个终端
curl -X POST http://localhost:8000/api/admin/seed
```

### 性能检查

```bash
python scripts/check_performance.py
```

### API 测试

```bash
python scripts/test_api_changes.py
```

---

## 项目架构

```
backend/
├── app/
│   ├── main.py              # 入口：FastAPI app, lifespan, middleware, health
│   ├── config.py             # 统一配置中心（所有环境变量）
│   ├── database.py           # SQLite 连接 + schema + 索引
│   ├── models.py             # Pydantic 请求/响应模型
│   │
│   ├── routers/              # 路由层（薄层，仅参数提取+委托）
│   │   ├── capsules.py       #   → capsule_service
│   │   ├── users.py          #   → user_service
│   │   ├── ai.py             #   → AI services
│   │   ├── upload.py         #   → storage_service
│   │   ├── admin.py          #   管理端点
│   │   ├── responses.py      #   → ResponseRepository
│   │   ├── favorites.py      #   → FavoriteRepository
│   │   └── collections.py    #   → CollectionRepository
│   │
│   ├── services/             # 业务服务层
│   │   ├── capsule_service.py    # 胶囊业务逻辑
│   │   ├── user_service.py       # 用户业务逻辑
│   │   ├── emotion_service.py    # GPT-4o-mini + 关键词 fallback
│   │   ├── location_service.py   # Nominatim + GPT
│   │   ├── scene_service.py      # GPT-4o Vision
│   │   ├── voice_clone_service.py # ElevenLabs
│   │   ├── recommend_service.py  # 4维度推荐引擎
│   │   ├── storage_service.py    # 文件上传/校验/压缩
│   │   └── geohash_service.py    # Geohash 编码 + 附近查询
│   │
│   └── repositories/         # 数据访问层（纯SQL，无业务逻辑）
│       ├── base.py               # 公共工具
│       ├── capsule_repository.py # capsules + media
│       ├── user_repository.py    # users
│       ├── response_repository.py # responses
│       ├── favorite_repository.py # favorites
│       ├── collection_repository.py # collections
│       └── interaction_repository.py # interactions
│
├── scripts/
│   ├── seed_demo.py              # 演示数据填充
│   ├── check_performance.py      # 性能基线检查
│   └── test_api_changes.py       # API 集成测试
│
├── docs/
│   ├── performance-baseline.md   # 性能基线文档
│   └── api-changes-02.md         # API 对接卡片
│
├── data/uploads/                 # 上传文件存储
├── .env.example                  # 环境变量模板
├── Procfile                      # Railway/Heroku 部署
├── railway.toml                  # Railway 配置
└── requirements.txt              # Python 依赖
```

---

## 分层原则

```
router → service → repository → aiosqlite
 (薄)     (业务)     (数据)      (驱动)
```

- **Router**：仅负责参数提取、校验、委托 service。不含 SQL。
- **Service**：业务逻辑、事务管理、DB 连接生命周期。
- **Repository**：纯数据库操作，不管理连接，不包含业务逻辑。
- **Config**：所有环境变量集中管理，无 AI key 不阻塞主流程。
