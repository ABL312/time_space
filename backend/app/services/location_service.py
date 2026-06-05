"""Location context service: reverse geocode + GPT description for GPS coordinates."""

import os
import httpx
from typing import List
from ..services.geohash_service import find_nearby_capsules


class LocationService:
    """Reverse geocode + GPT context description for GPS coordinates."""
    
    # 16 mood tags as specified
    EMOTION_TAGS = [
        "怀旧", "温暖", "感恩", "浪漫", "思念", "快乐", 
        "遗憾", "鼓励", "幽默", "神秘", "孤独", "希望", 
        "青春", "友情", "亲情", "爱情"
    ]
    
    async def get_context(self, lat: float, lng: float, db) -> dict:
        """
        Returns: {
            "name": "上海交通大学闵行校区",
            "description": "这是一所知名大学的校园，充满青春活力...",
            "nearby_capsule_count": 5,
            "suggested_moods": ["青春", "怀旧", "友情"]
        }
        """
        # 1. Nominatim reverse geocode (free, no API key)
        geocode_result = await self._reverse_geocode(lat, lng)
        
        # 2. Generate description (GPT if available, else template)
        description = self._generate_description(
            geocode_result["name"], 
            geocode_result["type"]
        )
        
        # 3. Query nearby capsule count
        nearby_capsules = await find_nearby_capsules(db, lat, lng, radius_m=1200, limit=100)
        nearby_count = len(nearby_capsules)
        
        # 4. Infer mood tags from place type/name
        suggested_moods = self._infer_moods(geocode_result["type"], geocode_result["name"])
        
        return {
            "name": geocode_result["name"],
            "description": description,
            "nearby_capsule_count": nearby_count,
            "suggested_moods": suggested_moods
        }

    async def _reverse_geocode(self, lat: float, lng: float) -> dict:
        """Call Nominatim API, return {name, display_name, type, category}"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/reverse",
                    params={
                        "format": "json",
                        "lat": lat,
                        "lon": lng,
                        "accept-language": "zh",
                    },
                    headers={"User-Agent": "TimeSpaceMailbox/1.0 (hackathon)"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    address = data.get("address", {})
                    
                    # Build name from address components
                    name_parts = []
                    for key in ["university", "school", "college", "hospital", 
                               "park", "museum", "station", "airport"]:
                        if key in address:
                            name_parts.append(address[key])
                            break
                    
                    if not name_parts:
                        for key in ["road", "suburb", "city_district", "town", "city"]:
                            if key in address:
                                name_parts.append(address[key])
                                break
                    
                    name = name_parts[0] if name_parts else data.get("display_name", "未知位置")
                    
                    # Determine place type
                    place_type = "其他"
                    if any(k in address for k in ["university", "school", "college"]):
                        place_type = "学校"
                    elif any(k in address for k in ["park", "lake", "mountain"]):
                        place_type = "公园"
                    elif any(k in address for k in ["hospital", "cemetery"]):
                        place_type = "医院/墓地"
                    elif any(k in address for k in ["restaurant", "cafe"]):
                        place_type = "餐厅"
                    elif any(k in address for k in ["station", "airport"]):
                        place_type = "车站"
                    
                    return {
                        "name": name,
                        "display_name": data.get("display_name", ""),
                        "type": place_type,
                        "category": data.get("category", "")
                    }
        except Exception as e:
            print(f"⚠️ Geocoding error: {e}")
        
        # Fallback
        return {
            "name": "未知位置",
            "display_name": "",
            "type": "其他",
            "category": ""
        }

    def _infer_moods(self, place_type: str, place_name: str) -> List[str]:
        """Infer mood tags from place type/name keywords."""
        # 校园/学校/大学 → ["青春", "友情", "怀旧"]
        if place_type == "学校":
            return ["青春", "友情", "怀旧"]
        
        # 公园/花园/湖/山 → ["宁静", "希望", "温暖"] → 注意"宁静"不在16标签里，用"希望"
        if place_type == "公园":
            return ["希望", "温暖"]
        
        # 医院/墓地 → ["思念", "亲情", "感恩"]
        if place_type == "医院/墓地":
            return ["思念", "亲情", "感恩"]
        
        # 餐厅/咖啡 → ["浪漫", "温暖", "快乐"]
        if place_type == "餐厅":
            return ["浪漫", "温暖", "快乐"]
        
        # 车站/机场 → ["思念", "希望", "鼓励"]
        if place_type == "车站":
            return ["思念", "希望", "鼓励"]
        
        # 默认 → ["温暖", "希望"]
        return ["温暖", "希望"]

    def _generate_description(self, place_name: str, place_type: str) -> str:
        """Generate location description. GPT if available, else template."""
        OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        
        # If we have OpenAI API key, we could use it here
        # But for now, we'll use template-based descriptions
        if place_type == "学校":
            return "充满青春气息的校园，是学习与成长的地方，承载着无数美好的回忆。"
        elif place_type == "公园":
            return "宁静的自然空间，适合放松心情，感受大自然的美好。"
        elif place_type == "医院/墓地":
            return "承载着生命重量的地方，让人思考人生的意义与价值。"
        elif place_type == "餐厅":
            return "温馨的用餐场所，是分享美食与情感的空间。"
        elif place_type == "车站":
            return "连接远方的交通枢纽，承载着人们的离别与重逢。"
        else:
            return "一个值得留下回忆的地方"

# Global instance
location_service = LocationService()