"""Reverse geocode + GPT context description for GPS coordinates.
Includes simple coordinate-rounding cache to avoid repeated Nominatim calls.
"""

import os
import time
import httpx
from typing import Dict, List
from ..services.geohash_service import find_nearby_capsules
from ..config import config

# Simple cache: keyed by (rounded_lat, rounded_lng) → 5-minute TTL
_LOCATION_CACHE: dict[tuple, tuple[float, dict]] = {}
_LOCATION_CACHE_TTL = 300  # 5 minutes
_MAX_CACHE_SIZE = 50


class LocationService:
    """Reverse geocode + GPT context description for GPS coordinates."""
    
    MOOD_TAGS = [
        "怀旧", "温暖", "感恩", "浪漫", "思念", 
        "快乐", "遗憾", "鼓励", "幽默", "神秘", 
        "孤独", "希望", "青春", "友情", "亲情", "爱情"
    ]
    
    PLACE_TYPE_MOOD_MAP = {
        "school": ["青春", "友情", "怀旧"],
        "college": ["青春", "友情", "怀旧"],
        "university": ["青春", "友情", "怀旧"],
        "park": ["希望", "温暖", "快乐"],
        "garden": ["希望", "温暖", "快乐"],
        "lake": ["希望", "温暖", "宁静"],
        "mountain": ["希望", "温暖", "宁静"],
        "hospital": ["思念", "亲情", "感恩"],
        "cemetery": ["思念", "亲情", "感恩"],
        "restaurant": ["浪漫", "温暖", "快乐"],
        "cafe": ["浪漫", "温暖", "快乐"],
        "station": ["思念", "希望", "鼓励"],
        "airport": ["思念", "希望", "鼓励"],
    }
    
    DESCRIPTION_TEMPLATES = {
        "school": "充满青春气息的校园，书声朗朗，是求知和成长的地方。",
        "college": "洋溢着青春活力的学院，承载着无数梦想与友谊。",
        "university": "这是一所知名大学的校园，充满青春活力和学术氛围。",
        "park": "宁静的自然空间，绿意盎然，适合放松身心。",
        "garden": "精心设计的花园，花香鸟语，让人感到平静祥和。",
        "lake": "碧波荡漾的湖泊，倒映着天空，带来内心的宁静。",
        "mountain": "壮丽的山脉景色，给人以力量和启发。",
        "hospital": "守护生命的地方，充满了关爱与希望。",
        "cemetery": "安静肃穆的场所，让人缅怀过往，珍惜当下。",
        "restaurant": "热闹的用餐场所，充满了欢声笑语和美食香气。",
        "cafe": "温馨的小憩之地，弥漫着咖啡香气和轻松氛围。",
        "station": "人来人往的交通枢纽，承载着人们的离别与重逢。",
        "airport": "连接世界的门户，充满了期待与告别的情感。",
        "default": "一个值得留下回忆的地方。"
    }

    async def get_context(self, lat: float, lng: float) -> Dict:
        """
        Returns: {
            "name": "上海交通大学闵行校区",
            "description": "这是一所知名大学的校园，充满青春活力...",
            "nearby_capsule_count": 5,
            "suggested_moods": ["青春", "怀旧", "友情"]
        }
        """
        # Check cache (round to 4 decimal places ≈ 11m precision)
        cache_key = (round(lat, 4), round(lng, 4))
        cached = _LOCATION_CACHE.get(cache_key)
        if cached:
            ts, result = cached
            if time.time() - ts < _LOCATION_CACHE_TTL:
                return result
            del _LOCATION_CACHE[cache_key]

        # 1. Nominatim reverse geocode (free, no API key)
        geocode_data = await self._reverse_geocode(lat, lng)
        
        if not geocode_data:
            result = {
                "name": "未知位置",
                "description": "一个神秘的地点",
                "nearby_capsule_count": 0,
                "suggested_moods": ["温暖", "希望"]
            }
            self._cache_set(cache_key, result)
            return result
        
        name = geocode_data.get("name", "未知位置")
        place_type = geocode_data.get("type", "")
        place_category = geocode_data.get("category", "")
        
        # 2. Generate description
        description = self._generate_description(name, place_type)
        
        # 3. Query nearby capsule count
        nearby_capsule_count = await self._get_nearby_capsule_count(lat, lng)
        
        # 4. Infer mood tags
        suggested_moods = self._infer_moods(place_type, name)
        
        result = {
            "name": name,
            "description": description,
            "nearby_capsule_count": nearby_capsule_count,
            "suggested_moods": suggested_moods
        }
        self._cache_set(cache_key, result)
        return result

    def _cache_set(self, key, result):
        if len(_LOCATION_CACHE) >= _MAX_CACHE_SIZE:
            oldest = min(_LOCATION_CACHE, key=lambda k: _LOCATION_CACHE[k][0])
            del _LOCATION_CACHE[oldest]
        _LOCATION_CACHE[key] = (time.time(), result)

    async def _reverse_geocode(self, lat: float, lng: float) -> Dict:
        """Call Nominatim API, return {name, display_name, type, category}"""
        url = f"https://nominatim.openstreetmap.org/reverse"
        params = {
            "format": "json",
            "lat": lat,
            "lon": lng,
            "accept-language": "zh"
        }
        headers = {
            "User-Agent": "TimeSpaceMailbox/1.0 (hackathon)"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, headers=headers, timeout=5.0)
                response.raise_for_status()
                data = response.json()
                
                address = data.get("address", {})
                name = address.get("name") or data.get("display_name", "").split(",")[0]
                
                # Determine place type and category
                place_type = ""
                category = ""
                
                # Check for specific place types
                if any(t in address for t in ["university", "college", "school"]):
                    place_type = address.get("university") or address.get("college") or address.get("school")
                    category = "education"
                elif any(t in address for t in ["park", "garden", "lake", "mountain"]):
                    place_type = address.get("park") or address.get("garden") or address.get("water") or address.get("natural")
                    category = "nature"
                elif "amenity" in address:
                    amenity = address["amenity"]
                    if amenity in ["hospital", "clinic"]:
                        category = "healthcare"
                    elif amenity in ["restaurant", "cafe"]:
                        category = "food"
                    place_type = amenity
                elif "railway" in address or "station" in address:
                    place_type = "station"
                    category = "transport"
                elif "aeroway" in address:
                    place_type = "airport"
                    category = "transport"
                
                return {
                    "name": name,
                    "display_name": data.get("display_name", ""),
                    "type": place_type,
                    "category": category
                }
        except Exception as e:
            print(f"⚠️ Reverse geocode error: {e}")
            return {}

    async def _get_nearby_capsule_count(self, lat: float, lng: float) -> int:
        """Get count of nearby capsules using geohash service."""
        # Import here to avoid circular imports
        from ..database import get_db
        
        try:
            db = await get_db()
            nearby_capsules = await find_nearby_capsules(db, lat, lng, limit=100)
            await db.close()
            return len(nearby_capsules)
        except Exception as e:
            print(f"⚠️ Error getting nearby capsule count: {e}")
            return 0

    def _infer_moods(self, place_type: str, place_name: str) -> List[str]:
        """Infer mood tags from place type/name keywords."""
        # Normalize place_type for matching
        normalized_type = place_type.lower().strip()
        
        # Try to match with our predefined map
        for key, moods in self.PLACE_TYPE_MOOD_MAP.items():
            if key in normalized_type or key in place_name.lower():
                return moods[:3]  # Return at most 3 moods
        
        # Special case for nature-related places that aren't in our map
        nature_keywords = ["公园", "花园", "湖", "山", "自然", "绿地"]
        for keyword in nature_keywords:
            if keyword in place_name:
                return ["希望", "温暖", "快乐"]
        
        # Default moods
        return ["温暖", "希望"]

    def _generate_description(self, place_name: str, place_type: str) -> str:
        """Generate location description. GPT if available, else template."""
        api_key = config.openai_api_key
        
        # Normalize place_type for template matching
        normalized_type = place_type.lower().strip()
        
        # Try to find a matching template
        description_template = self.DESCRIPTION_TEMPLATES.get("default")
        for key, template in self.DESCRIPTION_TEMPLATES.items():
            if key in normalized_type:
                description_template = template
                break
        
        # If we have an API key, try to generate a more detailed description with GPT
        if api_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                
                prompt = f"为以下地点生成一段富有诗意和情感的中文描述（不超过50字）：{place_name}。这是一个{place_type}类型的地点。"
                
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=100,
                    temperature=0.7,
                    timeout=5.0
                )
                
                gpt_description = response.choices[0].message.content.strip()
                if gpt_description:
                    return gpt_description
            except Exception as e:
                print(f"⚠️ GPT description generation failed: {e}")
        
        # Fallback to template-based description
        return description_template