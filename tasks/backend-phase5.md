你是「时空信箱」项目的 backend-dev，现在执行 Phase 5 任务。

## 你的任务: 创建演示数据填充脚本 (Issue #18)

### 目标
创建一个 Python 脚本，可以一键填充 3 个演示胶囊到数据库，供评委演示使用。

### 需要创建

**backend/scripts/seed_demo.py** — 独立脚本:

```python
"""
演示数据填充脚本。
用法: cd backend && python -m scripts.seed_demo
或通过 API: POST /api/admin/seed (开发环境)
"""

# 3 个演示胶囊:

# 点位 1: 校园门口 — 毕业生留言
capsule_1 = {
    "message": "四年前的秋天，我拖着行李箱第一次走进这扇大门。那时候觉得四年很长，长到可以慢慢挥霍。如今站在这里，才发现最美的风景不是建筑，而是那些一起熬夜、一起哭、一起笑的人。再见了，我的青春。希望下一个路过这里的你，也能找到属于自己的故事。",
    "latitude": 31.0282,  # 示例坐标，可调整
    "longitude": 121.4346,
    "mood_tag": "青春",
    "visibility": "public",
    "emotion_tags": ["青春", "怀旧", "友情", "感恩"],
    "sentiment": "positive",
    "emotion_intensity": 0.88,
    "emotion_summary": "毕业季的青春告别与感恩",
    "open_count": 23,
}

# 点位 2: 图书馆前 — 情侣留言
capsule_2 = {
    "message": "大三那年冬天，你在这里把围巾借给了我。我说不用了，你笑着说「你不冷我就不冷」。后来我们在一起了三年，现在你在国外读研，我在这里等你的信。如果你也路过这里，记得我们曾在这里一起看了很多很多的书，也看了很多很多的星星。",
    "latitude": 31.0295,
    "longitude": 121.4358,
    "mood_tag": "浪漫",
    "visibility": "public",
    "emotion_tags": ["浪漫", "思念", "温暖", "爱情"],
    "sentiment": "positive",
    "emotion_intensity": 0.92,
    "emotion_summary": "校园爱情的思念与等待",
    "open_count": 45,
}

# 点位 3: 老树下 — 家庭传承 + AI 克隆语音
capsule_3 = {
    "message": "奶奶总说这棵树有灵性，小时候她在树下给我讲故事，长大后我在树下想她。奶奶走了三年了，但每次回到这里，风吹过树叶的声音就像她在说话。我把她的声音留在了这里，如果你听到了，请替我告诉她：我很好，我很想她。",
    "latitude": 31.0271,
    "longitude": 121.4335,
    "mood_tag": "亲情",
    "visibility": "public",
    "emotion_tags": ["亲情", "思念", "怀旧", "温暖"],
    "sentiment": "positive",
    "emotion_intensity": 0.95,
    "emotion_summary": "对已故亲人的深情思念与传承",
    "open_count": 67,
}

# 脚本逻辑:
# 1. 连接 SQLite 数据库
# 2. 创建 3 个作者用户 (如果不存在)
# 3. 创建 3 个胶囊
# 4. 计算 geohash
# 5. 写入 emotion_tags 等 AI 分析结果（预设）
# 6. 可选: 为每个胶囊创建 1-2 个 mock media 记录
# 7. 打印结果摘要

# 注意:
# - 使用 aiosqlite 或直接 sqlite3（脚本可以同步）
# - 先检查是否已存在演示数据，避免重复插入
# - geohash 用 import geohash
# - UUID 生成用 uuid.uuid4()
```

**额外: 在 backend/app/routers/ 添加一个开发端点（可选）**:
```python
# 如果 main.py 有 dev mode 判断:
@router.post("/api/admin/seed")
async def seed_demo_data():
    """Development only: seed demo capsules."""
    # 调用 seed_demo 逻辑
```

### 技术要求
- 脚本可以独立运行: `cd backend && python -m scripts.seed_demo`
- 也可以作为 API 端点调用
- 幂等: 重复运行不重复插入（检查 capsule message 或特定标记）
- 使用项目现有的 database.py 和 geohash_service
- 打印清晰的中文输出: "✅ 创建演示用户: 毕业生小林" 等
- git commit -m "feat(backend): add demo data seeding script with 3 showcase capsules" (+ push if possible)

### 重要提醒
- 遇到任何报错，**停下来告诉我**
- 先读取 database.py 了解表结构
