import asyncio
import httpx
import redis.asyncio as redis
import json

async def verify_shadow_counting():
    print("Connecting to Redis...")
    r = redis.from_url("redis://localhost:6379/0", decode_responses=True)
    
    # Get current counts
    initial_shadow = int(await r.get("stats.shadow_total") or 0)
    initial_total = int(await r.get("stats.total_requests") or 0)
    print(f"Initial: shadow={initial_shadow}, total={initial_total}")
    
    # 1. Simulate Telemetry Shadow Hit (Agent 2)
    async with httpx.AsyncClient() as client:
        print("Simulating Telemetry Shadow Hit (Agent 2)...")
        # A hit to a URL Agent 2 recognizes as shadow
        payload = {
            "event": "hit",
            "method": "GET",
            "path": "/DVWA-rnaster/login.php",
            "host": "localhost",
            "full_url": "http://localhost/DVWA-rnaster/login.php",
            "timestamp": "2026-04-07T12:00:00Z"
        }
        await client.post("http://localhost:8010/api/v1/telemetry", json=payload)
    
    # Wait for broadcast
    await asyncio.sleep(1)
    
    mid_shadow = int(await r.get("stats.shadow_total") or 0)
    mid_total = int(await r.get("stats.total_requests") or 0)
    print(f"After Telemetry: shadow={mid_shadow}, total={mid_total}")
    
    if mid_shadow == initial_shadow:
        print("SUCCESS: Telemetry hit correctly DID NOT increment counter immediately (pending broadcast).")
    else:
        print(f"FAILED: Telemetry hit incremented counter prematurely: {mid_shadow}")

    # 2. Simulate Actual Shadow Agent Hit (Agent 3)
    # This happens when the browser actually hits port 8003
    async with httpx.AsyncClient() as client:
        print("Simulating Agent 3 Hit...")
        # Hit Agent 3 directly
        await client.get("http://localhost:8003/DVWA-rnaster/login.php")
    
    # Wait for broadcast
    await asyncio.sleep(1)
    
    final_shadow = int(await r.get("stats.shadow_total") or 0)
    final_total = int(await r.get("stats.total_requests") or 0)
    print(f"Final Count: shadow={final_shadow}, total={final_total}")
    
    if final_shadow == initial_shadow + 1:
        print("SUCCESS: Counter incremented by exactly 1 for the whole interaction.")
    else:
        print(f"FAILED: Counter incremented by {final_shadow - initial_shadow} (expected 1).")

    await r.close()

if __name__ == "__main__":
    asyncio.run(verify_shadow_counting())
