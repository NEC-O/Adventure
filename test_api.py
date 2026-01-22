import requests
import json

# 测试后端API
BASE_URL = "http://localhost:8000/api"

def test_api():
    print("测试故事管理API...")
    
    # 测试获取故事列表
    try:
        response = requests.get(f"{BASE_URL}/stories/")
        print(f"获取故事列表: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"找到 {data.get('total', 0)} 个故事")
        else:
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"连接错误: {e}")
    
    # 测试创建新故事
    try:
        story_data = {
            "theme": "一个勇敢的骑士在神秘的森林中冒险"
        }
        response = requests.post(f"{BASE_URL}/stories/create", json=story_data)
        print(f"创建新故事: {response.status_code}")
        if response.status_code == 200:
            job_data = response.json()
            print(f"任务ID: {job_data.get('job_id')}")
        else:
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"创建故事错误: {e}")

if __name__ == "__main__":
    test_api()