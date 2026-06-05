你是「时空信箱」项目的 backend-dev，现在执行 Phase 2 任务。

## 你的任务: 实现 AI 情感分析 (#5) + 智能推荐引擎 (#10)

### 目标
实现两个核心后端服务：情感分析和推荐引擎，并集成到现有路由中。

### 任务 A: AI 留言情感分析 (Issue #5/#7)

**需要实现的文件: backend/app/services/emotion_service.py (新建)**

```python
class EmotionService:
    """Analyze capsule messages for emotional tags using GPT-4o-mini with keyword fallback."""
    
    EMOTION_TAGS = ["怀旧","温暖","感恩","浪漫","思念","快乐","遗憾","鼓励",
                    "幽默","神秘","孤独","希望","青春","友情","亲情","爱情"]
    
    # 关键词 fallback 字典
    KEYWORD_MAP = {
        "怀旧": ["回忆","从前","曾经","过去","那年","小时候","旧时光","往事","记忆","当年"],
        "温暖": ["温暖","温馨","暖","幸福","安心","陪伴","踏实","感动"],
        "感恩": ["感谢","感恩","谢谢","感激","珍惜","幸运"],
        "浪漫": ["浪漫","心动","甜蜜","牵手","约会","月光","星星"],
        "思念": ["想你","思念","想念","远方","盼","等你","好想你","牵挂"],
        "快乐": ["开心","快乐","高兴","笑","哈哈","太好了","耶","棒"],
        "遗憾": ["遗憾","可惜","错过","来不及","如果当初","再也"],
        "鼓励": ["加油","坚持","勇敢","别放弃","你可以","相信自己","努力"],
        "幽默": ["哈哈","搞笑","笑死","段子","逗","哈哈","乐了"],
        "神秘": ["秘密","神秘","未知","奇遇","魔法","奇迹","不可思议"],
        "孤独": ["一个人","孤独","寂寞","独自","没人","空荡荡"],
        "希望": ["希望","期待","未来","梦想","相信","明天会","憧憬"],
        "青春": ["青春","毕业","校园","同学","高中","大学","年少","十八"],
        "友情": ["朋友","兄弟","闺蜜","友情","友谊","伙伴","一起"],
        "亲情": ["家人","爸妈","妈妈","爸爸","奶奶","爷爷","家","亲人"],
        "爱情": ["爱","喜欢","恋人","对象","男朋友","女朋友","表白","在一起"],
    }
    
    async def analyze(self, message: str) -> dict:
        """
        Returns: {
            "emotions": ["怀旧", "温暖"],  # 2-4 tags from EMOTION_TAGS
            "sentiment": "positive" | "negative" | "neutral",
            "intensity": 0.0-1.0,
            "summary": "一句话情感摘要"
        }
        """
        # 1. Try GPT-4o-mini (3s timeout)
        # 2. If fails → keyword fallback
        # 3. Always return valid result, never raise
    
    async def _analyze_with_gpt(self, message: str) -> dict:
        """Call GPT-4o-mini with JSON response format."""
        # openai SDK, model="gpt-4o-mini"
        # response_format={"type": "json_object"}
        # Prompt: analyze emotion, pick 2-4 from 16 tags, return JSON
        # 3 second timeout
    
    def _analyze_with_keywords(self, message: str) -> dict:
        """Fallback: match keywords against KEYWORD_MAP."""
        # Count keyword matches per tag
        # Pick top 2-4 tags by match count
        # If no matches: return ["温暖", "希望"] as default
        # sentiment: positive tags > negative tags → "positive" etc
        # intensity: min(matches / 5, 1.0)
```

**集成到 capsules.py:**
- 在 create_capsule 成功后，异步调用 emotion_service.analyze(message)
- 将结果写入 capsules 表的 emotion_tags, sentiment, emotion_intensity, emotion_summary 字段
- 使用 asyncio.create_task() 不阻塞响应

**实现 POST /api/ai/analyze-emotion 端点:**
- 在 ai.py router 中添加
- Body: { "message": "string" }
- Response: { "emotions": [...], "sentiment": "...", "intensity": 0.85, "summary": "..." }

### 任务 B: 智能推荐引擎 (Issue #10/#12)

**需要实现的文件: backend/app/services/recommend_service.py (已有骨架，需完善)**

精确公式:
- 距离分: max(0, 1 - distance_m / 1000) × 0.4
- 情感匹配: |用户兴趣标签 ∩ 胶囊情感标签| / max(|胶囊情感标签|, 1) × 0.3
- 场景匹配: |场景mood_match ∩ 胶囊情感标签| / max(|场景mood_match|, 1) × 0.2
- 热度: min(open_count / 50, 1.0) × 0.1
- 总分 = 距离分 + 情感匹配 + 场景匹配 + 热度

返回:
- top-3 为 recommended (按 match_score 降序)
- 其余为 others
- 每个胶囊附带 match_reasons 列表，例如:
  - "和你关注的「校园回忆」相关"
  - "就在你附近 (45m)"
  - "和当前场景氛围匹配"
  - "已被打开 23 次"

**确保 GET /api/capsules/nearby 正确调用推荐引擎并返回 match_score + match_reasons**

### 技术要求
- 所有函数 async/await
- Pydantic 做输入验证
- GPT 调用 3 秒超时 → 自动 fallback
- 没有 OPENAI_API_KEY 环境变量时直接用 fallback
- 错误返回: raise HTTPException
- 推荐引擎纯算法，无 LLM 调用，<50ms

### 工作流
1. git pull
2. 读取现有 recommend_service.py, ai.py, capsules.py, models.py, database.py
3. 创建 emotion_service.py
4. 完善 recommend_service.py
5. 修改 capsules.py 集成异步情感分析
6. 修改 ai.py 添加 analyze-emotion 端点
7. git add . && git commit -m "feat(backend): implement emotion analysis service with GPT fallback + recommendation engine" && git push origin main
