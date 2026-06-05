"""
Emotion analysis service: GPT-4o-mini with keyword fallback.
Analyzes capsule messages for emotional tags, sentiment, intensity, and summary.
"""
import os
import json
from typing import Optional


class EmotionService:
    """Analyze capsule messages for emotional tags using GPT-4o-mini with keyword fallback."""

    EMOTION_TAGS = [
        "怀旧", "温暖", "感恩", "浪漫", "思念", "快乐",
        "遗憾", "鼓励", "幽默", "神秘", "孤独", "希望",
        "青春", "友情", "亲情", "爱情",
    ]

    # Positive / negative classification for sentiment
    POSITIVE_TAGS = {"温暖", "感恩", "浪漫", "快乐", "鼓励", "幽默", "希望", "青春", "友情", "亲情", "爱情"}
    NEGATIVE_TAGS = {"遗憾", "孤独", "思念"}
    NEUTRAL_TAGS = {"怀旧", "神秘"}

    # Keyword fallback dictionary
    KEYWORD_MAP = {
        "怀旧": ["回忆", "从前", "曾经", "过去", "那年", "小时候", "旧时光", "往事", "记忆", "当年"],
        "温暖": ["温暖", "温馨", "暖", "幸福", "安心", "陪伴", "踏实", "感动"],
        "感恩": ["感谢", "感恩", "谢谢", "感激", "珍惜", "幸运"],
        "浪漫": ["浪漫", "心动", "甜蜜", "牵手", "约会", "月光", "星星"],
        "思念": ["想你", "思念", "想念", "远方", "盼", "等你", "好想你", "牵挂"],
        "快乐": ["开心", "快乐", "高兴", "笑", "哈哈", "太好了", "耶", "棒"],
        "遗憾": ["遗憾", "可惜", "错过", "来不及", "如果当初", "再也"],
        "鼓励": ["加油", "坚持", "勇敢", "别放弃", "你可以", "相信自己", "努力"],
        "幽默": ["哈哈", "搞笑", "笑死", "段子", "逗", "哈哈", "乐了"],
        "神秘": ["秘密", "神秘", "未知", "奇遇", "魔法", "奇迹", "不可思议"],
        "孤独": ["一个人", "孤独", "寂寞", "独自", "没人", "空荡荡"],
        "希望": ["希望", "期待", "未来", "梦想", "相信", "明天会", "憧憬"],
        "青春": ["青春", "毕业", "校园", "同学", "高中", "大学", "年少", "十八"],
        "友情": ["朋友", "兄弟", "闺蜜", "友情", "友谊", "伙伴", "一起"],
        "亲情": ["家人", "爸妈", "妈妈", "爸爸", "奶奶", "爷爷", "家", "亲人"],
        "爱情": ["爱", "喜欢", "恋人", "对象", "男朋友", "女朋友", "表白", "在一起"],
    }

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")

    async def analyze(self, message: str) -> dict:
        """
        Analyze emotion in a message.

        Returns:
            {
                "emotions": ["怀旧", "温暖"],       # 2-4 tags from EMOTION_TAGS
                "sentiment": "positive",             # positive | negative | neutral
                "intensity": 0.85,                   # 0.0 - 1.0
                "summary": "一句话情感摘要"
            }

        Strategy:
            1. Try GPT-4o-mini (3s timeout)
            2. If fails -> keyword fallback
            3. Always return valid result, never raise
        """
        if self.api_key:
            try:
                result = await self._analyze_with_gpt(message)
                return result
            except Exception as e:
                print(f"GPT emotion analysis failed: {e}, using keyword fallback")

        return self._analyze_with_keywords(message)

    async def _analyze_with_gpt(self, message: str) -> dict:
        """Call GPT-4o-mini with JSON response format. Raises on failure."""
        import asyncio
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        tags_str = json.dumps(self.EMOTION_TAGS, ensure_ascii=False)

        response = await asyncio.wait_for(
            client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"你是一个情感分析助手。分析时空信箱留言的情感特征。\n"
                            f"请返回JSON格式，包含以下字段：\n"
                            f"- emotions: 从以下标签中选择2-4个最匹配的：{tags_str}\n"
                            f"- sentiment: \'positive\'、\'negative\' 或 \'neutral\'\n"
                            f"- intensity: 0.0到1.0之间的浮点数，表示情感强度\n"
                            f"- summary: 一句话情感摘要（中文，15字以内）\n"
                            f"只返回JSON，不要其他内容。"
                        ),
                    },
                    {"role": "user", "content": f"留言内容：{message}"},
                ],
                response_format={"type": "json_object"},
                max_tokens=300,
                temperature=0.3,
            ),
            timeout=3.0,
        )

        try:
            result = json.loads(response.choices[0].message.content)
        except (json.JSONDecodeError, TypeError, AttributeError, IndexError) as e:
            print(f"GPT emotion analysis returned invalid JSON: {e}")
            # Fallback to keyword analysis
            return self._analyze_with_keywords(message)

        # Check if result is valid
        if not isinstance(result, dict):
            print("GPT emotion analysis returned invalid result structure")
            return self._analyze_with_keywords(message)

        # Validate and clamp
        emotions = [e for e in result.get("emotions", []) if e in self.EMOTION_TAGS][:4]
        # Ensure we have at least 2 emotions
        if len(emotions) < 2:
            # Try to get more emotions from the result before falling back
            all_emotions = [e for e in result.get("emotions", []) if e in self.EMOTION_TAGS]
            if len(all_emotions) >= 2:
                emotions = all_emotions[:4] if len(all_emotions) > 4 else all_emotions
            else:
                # Fallback to keyword analysis if we can't get enough emotions
                emotions = self._analyze_with_keywords(message)["emotions"]

        sentiment = result.get("sentiment", "positive")
        if sentiment not in ("positive", "negative", "neutral"):
            sentiment = self._classify_sentiment(emotions)

        intensity = float(result.get("intensity", 0.6))
        intensity = max(0.0, min(1.0, intensity))

        summary = result.get("summary", "")
        if not summary:
            summary = f"包含{'、'.join(emotions[:2])}情感的留言"

        return {
            "emotions": emotions,
            "sentiment": sentiment,
            "intensity": intensity,
            "summary": summary,
        }

    def _analyze_with_keywords(self, message: str) -> dict:
        """Fallback: match keywords against KEYWORD_MAP."""
        tag_scores = {}

        for tag, keywords in self.KEYWORD_MAP.items():
            count = sum(1 for kw in keywords if kw in message)
            if count > 0:
                tag_scores[tag] = count

        # Pick top 2-4 tags by match count
        if tag_scores:
            sorted_tags = sorted(tag_scores.items(), key=lambda x: x[1], reverse=True)
            emotions = [t[0] for t in sorted_tags[:4]]
            if len(emotions) < 2:
                emotions = emotions + ["温暖", "希望"][:2 - len(emotions)]
            total_matches = sum(tag_scores.values())
            intensity = min(total_matches / 5.0, 1.0)
        else:
            emotions = ["温暖", "希望"]
            intensity = 0.3

        sentiment = self._classify_sentiment(emotions)
        summary = f"包含{'、'.join(emotions[:2])}情感的留言"

        return {
            "emotions": emotions,
            "sentiment": sentiment,
            "intensity": round(intensity, 2),
            "summary": summary,
        }

    def _classify_sentiment(self, emotions: list[str]) -> str:
        """Classify overall sentiment based on emotion tags."""
        pos_count = sum(1 for e in emotions if e in self.POSITIVE_TAGS)
        neg_count = sum(1 for e in emotions if e in self.NEGATIVE_TAGS)

        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        return "neutral"


# Singleton instance
emotion_service = EmotionService()
