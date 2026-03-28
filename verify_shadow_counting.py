import asyncio
import json
import uuid
from redis import asyncio as redis

async def test_shadow_counting():
    r = redis.from_url("redis://localhost:6379/0", decode_responses=True)
    
    print("--- Shadow Counting Verification ---")
    
    # 1. Get initial stats
    initial_total = int(await r.get("stats.total_requests") or 0)
    initial_shadow = int(await r.get("stats.shadow_total") or 0)
    print(f"Initial - Total: {initial_total}, Shadow: {initial_shadow}")
    
    # 2. Mock a shadow activity (like from Agent 3)
    msg_id = str(uuid.uuid4())
    shadow_msg = {
        "channel": "shadow.activity",
        "attacker_ip": "127.0.0.1",
        "timestamp": "2026-03-28T12:00:00Z",
        "path": "/login.php",
        "method": "POST",
        "payload": "user=admin&pass=123",
        "user_agent": "Mozilla/5.0",
        "request_id": msg_id
    }
    
    print(f"Publishing mock shadow activity (ID: {msg_id})...")
    await r.publish("shadow.activity", json.dumps(shadow_msg))
    
    # Wait for Agent 2 to process (it's async)
    print("Waiting for broadcast listener to process...")
    await asyncio.sleep(1)
    
    # 3. Check new stats
    new_total = int(await r.get("stats.total_requests") or 0)
    new_shadow = int(await r.get("stats.shadow_total") or 0)
    print(f"New - Total: {new_total}, Shadow: {new_shadow}")
    
    if new_total > initial_total and new_shadow > initial_shadow:
        print("SUCCESS: Shadow activity was counted in both stats!")
    else:
        print("FAILURE: Counters did not increment correctly.")
        
    await r.close()

if __name__ == "__main__":
    asyncio.run(test_shadow_counting())
