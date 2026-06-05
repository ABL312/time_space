"""
演示数据填充脚本。
用法: cd backend && python -m scripts.seed_demo
或通过 API: POST /api/admin/seed (开发环境)
"""

import sys
import os
import json
import uuid
import sqlite3
from pathlib import Path

# Add the app directory to the path so we can import from it
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.geohash_service import encode
from app.database import SCHEMA_SQL


def get_db_connection():
    """获取数据库连接"""
    db_path = Path(__file__).parent.parent / "data" / "timespace.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    
    # 初始化数据库表结构
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    
    return conn


def check_if_demo_exists(conn):
    """检查是否已存在演示数据"""
    cursor = conn.cursor()
    
    # 检查是否存在特定的演示消息
    demo_messages = [
        "四年前的秋天，我拖着行李箱第一次走进这扇大门。",
        "大三那年冬天，你在这里把围巾借给了我。",
        "奶奶总说这棵树有灵性，小时候她在树下给我讲故事。"
    ]
    
    for msg in demo_messages:
        cursor.execute(
            "SELECT COUNT(*) as count FROM capsules WHERE message LIKE ?", 
            (f"{msg[:20]}%",)
        )
        result = cursor.fetchone()
        if result['count'] > 0:
            return True
    
    return False


def create_demo_users(conn):
    """创建演示用户"""
    cursor = conn.cursor()
    
    # 用户 1: 毕业生小林
    user1_id = "demo_graduate_xiaolin"
    cursor.execute(
        "INSERT OR IGNORE INTO users (id, name, interest_tags) VALUES (?, ?, ?)",
        (user1_id, "毕业生小林", json.dumps(["校园回忆", "青春", "友情"], ensure_ascii=False))
    )
    print("✅ 创建演示用户: 毕业生小林")
    
    # 用户 2: 情侣小李
    user2_id = "demo_couple_xiaoli"
    cursor.execute(
        "INSERT OR IGNORE INTO users (id, name, interest_tags) VALUES (?, ?, ?)",
        (user2_id, "情侣小李", json.dumps(["爱情", "浪漫", "思念"], ensure_ascii=False))
    )
    print("✅ 创建演示用户: 情侣小李")
    
    # 用户 3: 怀念者小王
    user3_id = "demo_memorial_xiaowang"
    cursor.execute(
        "INSERT OR IGNORE INTO users (id, name, interest_tags) VALUES (?, ?, ?)",
        (user3_id, "怀念者小王", json.dumps(["家庭传承", "亲情", "怀旧"], ensure_ascii=False))
    )
    print("✅ 创建演示用户: 怀念者小王")
    
    conn.commit()
    return user1_id, user2_id, user3_id


def create_demo_capsules(conn, user_ids):
    """创建演示胶囊"""
    cursor = conn.cursor()
    
    user1_id, user2_id, user3_id = user_ids
    
    # 点位 1: 校园门口 — 毕业生留言
    capsule_1_id = str(uuid.uuid4())
    capsule_1_data = {
        "id": capsule_1_id,
        "author_id": user1_id,
        "message": "四年前的秋天，我拖着行李箱第一次走进这扇大门。那时候觉得四年很长，长到可以慢慢挥霍。如今站在这里，才发现最美的风景不是建筑，而是那些一起熬夜、一起哭、一起笑的人。再见了，我的青春。希望下一个路过这里的你，也能找到属于自己的故事。",
        "latitude": 31.0282,
        "longitude": 121.4346,
        "geohash": encode(31.0282, 121.4346),
        "location_name": "校园门口",
        "mood_tag": "青春",
        "visibility": "public",
        "emotion_tags": json.dumps(["青春", "怀旧", "友情", "感恩"], ensure_ascii=False),
        "sentiment": "positive",
        "emotion_intensity": 0.88,
        "emotion_summary": "毕业季的青春告别与感恩",
        "open_count": 23,
    }
    
    cursor.execute("""
        INSERT OR IGNORE INTO capsules 
        (id, author_id, message, latitude, longitude, geohash, location_name, mood_tag, 
         visibility, emotion_tags, sentiment, emotion_intensity, emotion_summary, open_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        capsule_1_data["id"], capsule_1_data["author_id"], capsule_1_data["message"],
        capsule_1_data["latitude"], capsule_1_data["longitude"], capsule_1_data["geohash"],
        capsule_1_data["location_name"], capsule_1_data["mood_tag"], capsule_1_data["visibility"],
        capsule_1_data["emotion_tags"], capsule_1_data["sentiment"], capsule_1_data["emotion_intensity"],
        capsule_1_data["emotion_summary"], capsule_1_data["open_count"]
    ))
    print("✅ 创建演示胶囊 1: 校园门口的青春告别")
    
    # 点位 2: 图书馆前 — 情侣留言
    capsule_2_id = str(uuid.uuid4())
    capsule_2_data = {
        "id": capsule_2_id,
        "author_id": user2_id,
        "message": "大三那年冬天，你在这里把围巾借给了我。我说不用了，你笑着说「你不冷我就不冷」。后来我们在一起了三年，现在你在国外读研，我在这里等你的信。如果你也路过这里，记得我们曾在这里一起看了很多很多的书，也看了很多很多的星星。",
        "latitude": 31.0295,
        "longitude": 121.4358,
        "geohash": encode(31.0295, 121.4358),
        "location_name": "图书馆前",
        "mood_tag": "浪漫",
        "visibility": "public",
        "emotion_tags": json.dumps(["浪漫", "思念", "温暖", "爱情"], ensure_ascii=False),
        "sentiment": "positive",
        "emotion_intensity": 0.92,
        "emotion_summary": "校园爱情的思念与等待",
        "open_count": 45,
    }
    
    cursor.execute("""
        INSERT OR IGNORE INTO capsules 
        (id, author_id, message, latitude, longitude, geohash, location_name, mood_tag, 
         visibility, emotion_tags, sentiment, emotion_intensity, emotion_summary, open_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        capsule_2_data["id"], capsule_2_data["author_id"], capsule_2_data["message"],
        capsule_2_data["latitude"], capsule_2_data["longitude"], capsule_2_data["geohash"],
        capsule_2_data["location_name"], capsule_2_data["mood_tag"], capsule_2_data["visibility"],
        capsule_2_data["emotion_tags"], capsule_2_data["sentiment"], capsule_2_data["emotion_intensity"],
        capsule_2_data["emotion_summary"], capsule_2_data["open_count"]
    ))
    print("✅ 创建演示胶囊 2: 图书馆前的爱情等待")
    
    # 点位 3: 老树下 — 家庭传承 + AI 克隆语音
    capsule_3_id = str(uuid.uuid4())
    capsule_3_data = {
        "id": capsule_3_id,
        "author_id": user3_id,
        "message": "奶奶总说这棵树有灵性，小时候她在树下给我讲故事，长大后我在树下想她。奶奶走了三年了，但每次回到这里，风吹过树叶的声音就像她在说话。我把她的声音留在了这里，如果你听到了，请替我告诉她：我很好，我很想她。",
        "latitude": 31.0271,
        "longitude": 121.4335,
        "geohash": encode(31.0271, 121.4335),
        "location_name": "老树下",
        "mood_tag": "亲情",
        "visibility": "public",
        "emotion_tags": json.dumps(["亲情", "思念", "怀旧", "温暖"], ensure_ascii=False),
        "sentiment": "positive",
        "emotion_intensity": 0.95,
        "emotion_summary": "对已故亲人的深情思念与传承",
        "open_count": 67,
        "voice_clone_url": "/uploads/voice_clones/demo_grandma_story.mp3"
    }
    
    cursor.execute("""
        INSERT OR IGNORE INTO capsules 
        (id, author_id, message, latitude, longitude, geohash, location_name, mood_tag, 
         visibility, emotion_tags, sentiment, emotion_intensity, emotion_summary, open_count, voice_clone_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        capsule_3_data["id"], capsule_3_data["author_id"], capsule_3_data["message"],
        capsule_3_data["latitude"], capsule_3_data["longitude"], capsule_3_data["geohash"],
        capsule_3_data["location_name"], capsule_3_data["mood_tag"], capsule_3_data["visibility"],
        capsule_3_data["emotion_tags"], capsule_3_data["sentiment"], capsule_3_data["emotion_intensity"],
        capsule_3_data["emotion_summary"], capsule_3_data["open_count"], capsule_3_data["voice_clone_url"]
    ))
    print("✅ 创建演示胶囊 3: 老树下的亲情传承")
    
    conn.commit()
    return [capsule_1_id, capsule_2_id, capsule_3_id]


def create_mock_media(conn, capsule_ids):
    """为演示胶囊创建模拟媒体记录"""
    cursor = conn.cursor()
    
    # 为胶囊1创建图片
    media_id_1 = str(uuid.uuid4())
    cursor.execute("""
        INSERT OR IGNORE INTO media (id, capsule_id, type, url, thumbnail_url, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        media_id_1, capsule_ids[0], "photo", 
        "/uploads/photos/demo_graduation.jpg", 
        "/uploads/thumbnails/demo_graduation_thumb.jpg", 
        0
    ))
    print("✅ 为胶囊1创建模拟图片媒体")
    
    # 为胶囊2创建图片
    media_id_2 = str(uuid.uuid4())
    cursor.execute("""
        INSERT OR IGNORE INTO media (id, capsule_id, type, url, thumbnail_url, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        media_id_2, capsule_ids[1], "photo", 
        "/uploads/photos/demo_library_couple.jpg", 
        "/uploads/thumbnails/demo_library_couple_thumb.jpg", 
        0
    ))
    print("✅ 为胶囊2创建模拟图片媒体")
    
    # 为胶囊3创建音频
    media_id_3 = str(uuid.uuid4())
    cursor.execute("""
        INSERT OR IGNORE INTO media (id, capsule_id, type, url, sort_order)
        VALUES (?, ?, ?, ?, ?)
    """, (
        media_id_3, capsule_ids[2], "audio", 
        "/uploads/voices/demo_grandma_voice.mp3", 
        0
    ))
    print("✅ 为胶囊3创建模拟音频媒体")
    
    conn.commit()


def main():
    """主函数"""
    print("🌱 开始填充演示数据...")
    
    # 获取数据库连接
    conn = get_db_connection()
    
    try:
        # 检查是否已存在演示数据
        if check_if_demo_exists(conn):
            print("⚠️  演示数据已存在，跳过填充")
            return
        
        # 创建演示用户
        user_ids = create_demo_users(conn)
        
        # 创建演示胶囊
        capsule_ids = create_demo_capsules(conn, user_ids)
        
        # 创建模拟媒体记录
        create_mock_media(conn, capsule_ids)
        
        print("\n🎉 演示数据填充完成！")
        print("   - 创建了 3 个演示用户")
        print("   - 创建了 3 个演示胶囊")
        print("   - 创建了 3 个模拟媒体记录")
        print("\n应用查看地址:")
        print("   1. 校园门口 (青春告别)")
        print("   2. 图书馆前 (爱情等待)")
        print("   3. 老树下 (亲情传承)")
        
    except Exception as e:
        print(f"❌ 填充演示数据时出错: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()