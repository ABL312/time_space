"""Analyze camera/photo images for scene context using GPT-4o Vision."""

import os
import base64
from typing import Dict, List, Optional
from ..services.location_service import LocationService


class SceneService:
    """Analyze camera/photo images for scene context using GPT-4o Vision."""
    
    SCENE_TYPES = ["校园", "公园", "商业区", "居民区", "交通枢纽", "历史文化", "自然景观", "室内"]
    
    MOOD_TAGS = [
        "怀旧", "温暖", "感恩", "浪漫", "思念", 
        "快乐", "遗憾", "鼓励", "幽默", "神秘", 
        "孤独", "希望", "青春", "友情", "亲情", "爱情"
    ]

    def __init__(self):
        self.location_service = LocationService()

    async def analyze(self, image_bytes: bytes, lat: float = None, lng: float = None) -> Dict:
        """
        Returns: {
            "scene_type": "校园",
            "description": "一个宁静的大学校园，绿树成荫...",
            "atmosphere": "青春活力与怀旧氛围",
            "mood_match": ["青春", "怀旧", "友情"]
        }
        """
        # 1. Try GPT-4o Vision (if OPENAI_API_KEY available)
        try:
            if os.getenv("OPENAI_API_KEY", ""):
                result = await self._analyze_with_gpt(image_bytes)
                if result:
                    return result
        except Exception as e:
            print(f"⚠️ GPT-4o Vision analysis failed: {e}")
        
        # 2. Fallback (no API key or timeout):
        #    Return generic scene based on GPS location (use LocationService)
        #    Or return default: scene_type="未知", description="一个充满故事的地方", mood_match=["温暖","希望"]
        return self._fallback_scene(lat, lng)

    async def _analyze_with_gpt(self, image_bytes: bytes) -> Optional[Dict]:
        """Call GPT-4o with vision, return scene analysis."""
        import httpx
        from openai import OpenAI
        
        # Convert image to base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请分析这张图片的场景类型、氛围描述和匹配的情绪标签。请用中文回答，严格按照以下JSON格式返回结果：\n{\n  \"scene_type\": \"校园|公园|商业区|居民区|交通枢纽|历史文化|自然景观|室内\",\n  \"description\": \"场景的详细描述，不超过50个字\",\n  \"atmosphere\": \"场景的整体氛围，不超过20个字\",\n  \"mood_match\": [\"情绪标签1\", \"情绪标签2\", \"情绪标签3\"]\n}\n\n情绪标签只能从以下列表中选择（最多3个）：怀旧、温暖、感恩、浪漫、思念、快乐、遗憾、鼓励、幽默、神秘、孤独、希望、青春、友情、亲情、爱情"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            timeout=5.0
        )
        
        # Parse the JSON response
        content = response.choices[0].message.content
        if content:
            import json
            result = json.loads(content)
            
            # Validate the result has required fields
            if all(key in result for key in ["scene_type", "description", "atmosphere", "mood_match"]):
                # Ensure scene_type is valid
                if result["scene_type"] in self.SCENE_TYPES:
                    # Ensure mood_match only contains valid tags
                    valid_moods = [mood for mood in result["mood_match"] if mood in self.MOOD_TAGS]
                    result["mood_match"] = valid_moods[:3]  # Limit to 3 moods
                    return result
        
        return None

    def _fallback_scene(self, lat: float = None, lng: float = None) -> Dict:
        """Generic fallback when GPT unavailable."""
        # If we have GPS coordinates, try to get location context
        if lat is not None and lng is not None:
            try:
                # In a real implementation, we would await this
                # For fallback purposes, we'll use a simplified approach
                # Let's actually implement this properly now
                
                # Create a new event loop to run the async function
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                # Run the async function
                location_context = loop.run_until_complete(
                    self.location_service.get_context(lat, lng)
                )
                
                # Use some of the location context for our scene analysis
                scene_type_map = {
                    "school": "校园",
                    "college": "校园",
                    "university": "校园",
                    "park": "自然景观",
                    "garden": "自然景观",
                    "lake": "自然景观",
                    "mountain": "自然景观",
                    "station": "交通枢纽",
                    "airport": "交通枢纽",
                }
                
                # Try to determine scene type from location context
                scene_type = "未知"
                for key, value in scene_type_map.items():
                    if key in location_context.get("name", "").lower():
                        scene_type = value
                        break
                
                return {
                    "scene_type": scene_type,
                    "description": location_context.get("description", "一个充满故事的地方"),
                    "atmosphere": "基于位置推断的场景",
                    "mood_match": location_context.get("suggested_moods", ["温暖", "希望"])[:3]
                }
            except Exception as e:
                print(f"⚠️ Location service fallback failed: {e}")
        
        # Default fallback
        return {
            "scene_type": "未知",
            "description": "一个充满故事的地方",
            "atmosphere": "神秘而有趣",
            "mood_match": ["温暖", "希望"]
        }