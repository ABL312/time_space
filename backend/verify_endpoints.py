import requests
import sys

BASE_URL = "http://localhost:8000"

def test_user_flow():
    print("🧪 Testing User Registration and Profile Updates...")
    
    # 1. Register a new user
    user_data = {
        "name": "测试小王",
        "interest_tags": ["摄影", "旅行", "美食"]
    }
    r = requests.post(f"{BASE_URL}/api/users", json=user_data)
    assert r.status_code == 201, f"Registration failed: {r.text}"
    res = r.json()
    assert "token" in res and res["token"], "No token returned on registration"
    assert "id" in res and res["id"], "No user id returned on registration"
    
    user_id = res["id"]
    token = res["token"]
    print(f"✅ Registered user '{res['name']}' with ID '{user_id}' and Token.")
    
    # 2. Update profile with correct token
    update_data = {
        "name": "测试小王-修改版",
        "interest_tags": ["摄影", "旅行", "怀旧"]
    }
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_data, headers=headers)
    assert r.status_code == 200, f"Profile update failed: {r.text}"
    assert r.json()["name"] == "测试小王-修改版", "Profile name did not update"
    print("✅ Profile updated successfully with owner's token.")
    
    # 3. Update profile with incorrect token
    bad_headers = {"Authorization": "Bearer token_xiaoli"}
    r = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_data, headers=bad_headers)
    assert r.status_code == 403, f"Expected 403 but got {r.status_code}: {r.text}"
    print("✅ Profile update correctly blocked (403 Forbidden) with a different user's token.")

def test_capsule_auth_and_visibility():
    print("\n🧪 Testing Capsule Authorization and Visibility...")
    
    # 1. Query capsules/mine without auth token
    r = requests.get(f"{BASE_URL}/api/capsules/mine", params={"user_id": "demo_graduate_xiaolin"})
    assert r.status_code == 401, f"Expected 401 but got {r.status_code}: {r.text}"
    print("✅ Unauthenticated access to /capsules/mine blocked (401 Unauthorized).")
    
    # 2. Query capsules/mine with valid token
    headers = {"Authorization": "Bearer token_xiaolin"}
    r = requests.get(f"{BASE_URL}/api/capsules/mine", params={"user_id": "demo_graduate_xiaolin"}, headers=headers)
    assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
    print("✅ Authenticated access to /capsules/mine succeeded (200 OK).")
    
    # 3. Create a private capsule
    headers_xiaolin = {"Authorization": "Bearer token_xiaolin"}
    # Need to send form data for create_capsule
    data = {
        "message": "这是一封仅属于我自己的私密时光来信，别人不应该看到。",
        "latitude": 31.0282,
        "longitude": 121.4346,
        "visibility": "private"
    }
    r = requests.post(f"{BASE_URL}/api/capsules", data=data, headers=headers_xiaolin)
    assert r.status_code == 201, f"Capsule creation failed: {r.text}"
    capsule = r.json()
    capsule_id = capsule["id"]
    assert capsule["author_id"] == "demo_graduate_xiaolin", "Author ID mismatch"
    assert capsule["visibility"] == "private", "Visibility is not private"
    print(f"✅ Private capsule created with ID '{capsule_id}' and author 'demo_graduate_xiaolin'.")
    
    # 4. View private capsule as owner
    r = requests.get(f"{BASE_URL}/api/capsules/{capsule_id}", headers=headers_xiaolin)
    assert r.status_code == 200, f"Owner failed to view private capsule: {r.text}"
    print("✅ Owner can view their own private capsule.")
    
    # 5. View private capsule as another user (should fail with 403 Forbidden)
    headers_xiaoli = {"Authorization": "Bearer token_xiaoli"}
    r = requests.get(f"{BASE_URL}/api/capsules/{capsule_id}", headers=headers_xiaoli)
    assert r.status_code == 403, f"Expected 403 but got {r.status_code}: {r.text}"
    print("✅ Other users are blocked (403 Forbidden) from viewing private capsules.")

if __name__ == "__main__":
    try:
        test_user_flow()
        test_capsule_auth_and_visibility()
        print("\n🎉 All integration verification tests passed successfully!")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
