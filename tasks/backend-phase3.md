你是「时空信箱」项目的 backend-dev，现在执行 Phase 3 任务。

## 你的任务: AI 位置上下文 (#14) + AI 视觉场景识别 (#15)

### 任务 A: AI 位置上下文服务 (Issue #14)

**新建: backend/app/services/location_service.py**

```python
class LocationService:
    """Reverse geocode + GPT context description for GPS coordinates."""
    
    async def get_context(self, lat: float, lng: float) -> dict:
        """
        Returns: {
            "name": "上海交通大学闵行校区",
            "description": "这是一所知名大学的校园，充满青春活力...",
            "nearby_capsule_count": 5,
            "suggested_moods": ["青春", "怀旧", "友情"]
        }
        """
        # 1. Nominatim reverse geocode (free, no API key)
        #    URL: https://nominatim.openstreetmap.org/reverse?format=json&lat=X&lon=Y&accept-language=zh
        #    超时: 5s
        #    失败 fallback: name="未知位置", description="一个神秘的地点"
        
        # 2. (Optional) GPT 描述: 基于地点名称生成氛围描述
        #    如果没有 OPENAI_API_KEY: 根据地点类型生成 mock 描述
        #    学校类 → "充满青春气息的校园..."
        #    公园类 → "宁静的自然空间..."
        #    商业区 → "繁华的城市中心..."
        #    默认 → "一个值得留下回忆的地方"
        
        # 3. 查询该地点附近胶囊数量 (用 geohash)
        
        # 4. 根据地点类型推荐 mood 标签
        #    从16标签中选2-3个: 怀旧、温暖、感恩、浪漫、思念、快乐、遗憾、鼓励、幽默、神秘、孤独、希望、青春、友情、亲情、爱情
    
    async def _reverse_geocode(self, lat: float, lng: float) -> dict:
        """Call Nominatim API, return {name, display_name, type, category}"""
        # Use httpx or aiohttp for async HTTP
        # User-Agent header required by Nominatim ToS
        # Fallback on timeout/error
    
    def _infer_moods(self, place_type: str, place_name: str) -> list[str]:
        """Infer mood tags from place type/name keywords."""
        # 校园/学校/大学 → ["青春", "友情", "怀旧"]
        # 公园/花园/湖/山 → ["宁静", "希望", "温暖"] → 注意"宁静"不在16标签里，用"希望"
        # 医院/墓地 → ["思念", "亲情", "感恩"]
        # 餐厅/咖啡 → ["浪漫", "温暖", "快乐"]
        # 车站/机场 → ["思念", "希望", "鼓励"]
        # 默认 → ["温暖", "希望"]
    
    def _generate_description(self, place_name: str, place_type: str) -> str:
        """Generate location description. GPT if available, else template."""
```

**端点: GET /api/ai/location-context?lat=&lng=**
- 在 ai.py router 中添加（如果已有骨架就修改）
- Response 200: { "name", "description", "nearby_capsule_count", "suggested_moods": [...] }
- 必须有 fallback，不能 500

### 任务 B: AI 视觉场景识别 (Issue #15)

**新建: backend/app/services/scene_service.py**

```python
class SceneService:
    """Analyze camera/photo images for scene context using GPT-4o Vision."""
    
    SCENE_TYPES = ["校园", "公园", "商业区", "居民区", "交通枢纽", "历史文化", "自然景观", "室内"]
    
    async def analyze(self, image_bytes: bytes, lat: float = None, lng: float = None) -> dict:
        """
        Returns: {
            "scene_type": "校园",
            "description": "一个宁静的大学校园，绿树成荫...",
            "atmosphere": "青春活力与怀旧氛围",
            "mood_match": ["青春", "怀旧", "友情"]
        }
        """
        # 1. Try GPT-4o Vision (if OPENAI_API_KEY available)
        #    Send image as base64
        #    Prompt: identify scene type, describe atmosphere, suggest moods
        #    超时: 5s
    
        # 2. Fallback (no API key or timeout):
        #    Return generic scene based on GPS location (use LocationService)
        #    Or return default: scene_type="未知", description="一个充满故事的地方", mood_match=["温暖","希望"]
    
    async def _analyze_with_gpt(self, image_bytes: bytes) -> dict:
        """Call GPT-4o with vision, return scene analysis."""
        # Convert image to base64
        # response_format={"type": "json_object"}
        # 5s timeout
    
    def _fallback_scene(self, lat: float = None, lng: float = None) -> dict:
        """Generic fallback when GPT unavailable."""
```

**端点: POST /api/ai/scene**
- 格式: FormData
- 字段: image(file), latitude(float,可选), longitude(float,可选)
- Response 200: { "scene_type", "description", "atmosphere", "mood_match": [...] }
- 必须有 fallback，不能 500

### 技术要求
- 所有函数 async/await
- httpx 或 aiohttp 做 HTTP 请求（检查 requirements.txt 有什么就用什么）
- Nominatim User-Agent: "TimeSpaceMailbox/1.0 (hackathon)"
- 没有 API key → 用 fallback，不能让 API 500
- GPT 调用 5 秒超时
- Pydantic 模型做响应验证
- 16 个情感标签: 怀旧、温暖、感恩、浪漫、思念、快乐、遗憾、鼓励、幽默、神秘、孤独、希望、青春、友情、亲情、爱情

### 重要提醒
- 如果现有 ai.py router 已有这两个端点的骨架，在其基础上修改
- 如果需要新增依赖到 requirements.txt，加上
- 如果遇到任何报错或不确定的地方，**停下来告诉我**

### 工作流
1. 读取现有 ai.py, database.py, geohash_service.py, requirements.txt
2. 创建 location_service.py
3. 创建 scene_service.py
4. 修改 ai.py 注册端点
5. 如需新增依赖，更新 requirements.txt
6. git add . && git commit -m "feat(backend): implement location context + scene recognition AI services" (+ push if possible)
