"""
Recommendation engine: 4-dimension weighted scoring.
- Distance (40%)
- Emotion match (30%)  
- Scene match (20%)
- Popularity (10%)
"""
import json
from typing import Optional


def calculate_match_score(
    capsule: dict,
    user_interest_tags: list[str],
    scene_mood_match: Optional[list[str]] = None,
    max_distance_m: float = 1000,
) -> tuple[float, list[str]]:
    """
    Calculate match score (0-1) and reasons for a capsule.
    
    Returns (score, reasons_list).
    """
    scores = {}
    reasons = []

    # 1. Distance score (40% weight)
    distance_m = capsule.get("distance_m", max_distance_m)
    distance_score = max(0, 1 - distance_m / max_distance_m)
    scores["distance"] = distance_score * 0.4

    if distance_m < 100:
        reasons.append(f"就在你附近 ({int(distance_m)}m)")

    # 2. Emotion tag match (30% weight)
    emotion_tags_raw = capsule.get("emotion_tags")
    if emotion_tags_raw:
        if isinstance(emotion_tags_raw, str):
            try:
                emotion_tags = json.loads(emotion_tags_raw)
            except (json.JSONDecodeError, TypeError):
                emotion_tags = []
        else:
            emotion_tags = emotion_tags_raw
    else:
        emotion_tags = []

    if emotion_tags and user_interest_tags:
        intersection = set(emotion_tags) & set(user_interest_tags)
        emotion_score = len(intersection) / max(len(emotion_tags), 1)
        scores["emotion"] = emotion_score * 0.3

        if intersection:
            matched = "、".join(list(intersection)[:2])
            reasons.append(f"和你关注的「{matched}」相关")

    # 3. Scene match (20% weight)
    if scene_mood_match and emotion_tags:
        scene_intersection = set(scene_mood_match) & set(emotion_tags)
        scene_score = len(scene_intersection) / max(len(scene_mood_match), 1)
        scores["scene"] = scene_score * 0.2

        if scene_intersection:
            reasons.append("和当前场景氛围匹配")

    # 4. Popularity (10% weight)
    open_count = capsule.get("open_count", 0)
    popularity_score = min(open_count / 50, 1.0)
    scores["popularity"] = popularity_score * 0.1

    if open_count >= 10:
        reasons.append(f"已被打开 {open_count} 次")

    total_score = sum(scores.values())
    return round(total_score, 3), reasons


def rank_capsules(
    capsules: list[dict],
    user_interest_tags: list[str],
    scene_mood_match: Optional[list[str]] = None,
    top_n: int = 3,
) -> tuple[list[dict], list[dict]]:
    """
    Rank capsules by match score and split into recommended + others.
    
    Returns (recommended_list, others_list).
    """
    scored = []
    for capsule in capsules:
        score, reasons = calculate_match_score(
            capsule, user_interest_tags, scene_mood_match
        )
        capsule["match_score"] = score
        capsule["match_reasons"] = reasons
        scored.append(capsule)

    # Sort by match score descending
    scored.sort(key=lambda x: x["match_score"], reverse=True)

    # Split into recommended (top_n) and others
    recommended = scored[:top_n]
    others = scored[top_n:]

    return recommended, others
