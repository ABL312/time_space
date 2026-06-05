"""AI scene recognition service using GPT-4o Vision or fallbacks."""

import os
import json
import base64
import httpx
from typing import Optional
from openai import AsyncOpenAI

from .location_service import LocationService
from ..models import SceneResponse


class SceneService:
    """Analyze camera/photo images for scene context using GPT-4o Vision."""

    SCENE_TYPES = [
        "校园", "公园", "商业区", "居民区", 
        "交通枢纽", "历史文化", "自然景观", "室内"
    ]
    
    # 16 emotional tags as specified
    EMOTION_TAGS = [
        "怀旧", "温暖", "感恩", "浪漫", "思念", 
        "快乐", "遗憾", "鼓励", "幽默", "神秘", 
        "孤独", "希望", "青春", "友情", "亲情", "爱情"
    ]

    def __init__(self):
        self.location_service = LocationService()
        self.openai_client = None
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.openai_client = AsyncOpenAI(api_key=api_key)

    async def analyze(
        self, 
        image_bytes: bytes, 
        lat: Optional[float] = None, 
        lng: Optional[float] = None
    ) -> dict:
        """
        Analyze an image for scene context using GPT-4o Vision or fallbacks.
        
        Returns: {
            "scene_type": "校园",
            "description": "一个宁静的大学校园，绿树成荫...",
            "atmosphere": "青春活力与怀旧氛围",
            "mood_match": ["青春", "怀旧", "友情"]
        }
        """
        # 1. Try GPT-4o Vision (if OPENAI_API_KEY available)
        if self.openai_client:
            try:
                result = await self._analyze_with_gpt(image_bytes)
                return result
            except Exception as e:
                print(f"⚠️ GPT-4o Vision analysis failed: {e}")
                # Fall through to fallback
        
        # 2. Fallback (no API key or timeout):
        #    Return generic scene based on GPS location (use LocationService)
        #    Or return default: scene_type="未知", description="一个充满故事的地方", mood_match=["温暖","希望"]
        return self._fallback_scene(lat, lng)

    async def _analyze_with_gpt(self, image_bytes: bytes) -> dict:
        """Call GPT-4o with vision, return scene analysis."""
        # Convert image to base64
        b64_image = base64.b64encode(image_bytes).decode()
        
        # Create the prompt with specific instructions
        prompt_text = (
            f'分析这张照片的场景类型和氛围。请严格按照以下JSON格式返回结果：'
            f'{{"scene_type": "...", "description": "...", "atmosphere": "...", "mood_match": [...]}}。'
            f'mood_match字段请从以下标签中选择2-3个最匹配的：{json.dumps(self.EMOTION_TAGS, ensure_ascii=False)}'
            f'。scene_type请从以下类型中选择最合适的一个：{json.dumps(self.SCENE_TYPES, ensure_ascii=False)}'
        )
        
        # Make the API call with timeout
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的图像场景分析师，请客观准确地分析图片内容。",
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_image}",
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt_text,
                        },
                    ],
                },
            ],
            max_tokens=300,
            timeout=5.0,
            response_format={"type": "json_object"},
        )
        
        # Parse and return the result
        result = json.loads(response.choices[0].message.content)
        return result

    def _fallback_scene(
        self, 
        lat: Optional[float] = None, 
        lng: Optional[float] = None
    ) -> dict:
        """Generic fallback when GPT unavailable."""
        # If we have GPS coordinates, try to get location context
        if lat is not None and lng is not None:
            try:
                # This would be a synchronous call in a fallback, but since our
                # LocationService methods are async, we'll need to handle this differently
                # For now, we'll return a generic fallback
                pass
            except Exception as e:
                print(f"⚠️ Location service fallback failed: {e}")
        
        # Default fallback response
        return {
            "scene_type": "未知",
            "description": "一个充满故事的地方",
            "atmosphere": "神秘而有趣",
            "mood_match": ["温暖", "希望"]
        }