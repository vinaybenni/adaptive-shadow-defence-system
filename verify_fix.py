import asyncio
import httpx
import redis.asyncio as redis
import json

async def verify_telemetry():
    print("Connecting to Redis...")
    r = redis.from_url("redis://localhost:6379/0", decode_responses=True)
    
    # Get current count
    initial_count = int(await r.get("stats.total_requests") or 0)
    print(f"Initial total_requests: {initial_count}")
    
    # Subscribe to risk.events
    pubsub = r.pubsub()
    await pubsub.subscribe("risk.events")
    print("Subscribed to risk.events")
    
    # Send telemetry hit
    async with httpx.AsyncClient() as client:
        print("Sending telemetry hit...")
        payload = {
            "event": "hit",
            "method": "GET",
            "path": "/DVWA-master/login.php",
            "host": "localhost",
            "full_url": "http://localhost/DVWA-master/login.php",
            "timestamp": "2026-04-06T10:00:00Z"
        }
        resp = await client.post("http://localhost:8010/api/v1/telemetry", json=payload)
        print(f"Response: {resp.status_code} - {resp.text}")
    
    # Wait for message and check increment
    print("Waiting for Redis message...")
    try:
        # Use timeout to avoid hanging if it fails
        msg = None
        for _ in range(50): # 5 seconds approx
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
            if msg:
                break
        
        if msg:
            data = json.loads(msg['data'])
            print(f"SUCCESS: Received Redis message: {json.dumps(data, indent=2)}")
        else:
            print("FAILED: No Redis message received within timeout")
        
        final_count = int(await r.get("stats.total_requests") or 0)
        print(f"Final total_requests: {final_count}")
        
        if final_count > initial_count:
            print(f"SUCCESS: total_requests incremented ({initial_count} -> {final_count})")
        else:
            print("FAILED: total_requests did not increment")
            
    finally:
        await pubsub.unsubscribe("risk.events")
        await r.close()

if __name__ == "__main__":
    asyncio.run(verify_telemetry())
