import httpx
import asyncio

async def test_verification():
    base_url = "http://localhost:8010"
    
    # 1. Get initial stats
    print("Fetching initial stats...")
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base_url}/api/v1/stats")
        initial_stats = resp.json()["stats"]
        print(f"Initial stats: {initial_stats}")

    # 2. Register a website
    print("Registering website test.com...")
    app_config = {
        "name": "test",
        "domain": "test.com",
        "real_upstream": "http://test.com",
        "shadow_upstream": "http://shadow.test.com",
        "protection_enabled": True
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{base_url}/api/v1/apps", json=app_config)
        print(f"Register status: {resp.status_code}")

    # 3. Send telemetry for registered website
    print("Sending telemetry for registered website test.com...")
    telemetry_data = {
        "event": "hit",
        "host": "test.com",
        "full_url": "http://test.com/index.php",
        "path": "/",
        "method": "GET"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{base_url}/api/v1/telemetry", json=telemetry_data)
        print(f"Telemetry response (registered): {resp.status_code} - {resp.json()}")

    # 4. Send telemetry for UNREGISTERED website
    print("Sending telemetry for unregistered website unknown.com...")
    unregistered_telemetry = {
        "event": "hit",
        "host": "unknown.com",
        "full_url": "http://unknown.com/index.php",
        "path": "/",
        "method": "GET"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{base_url}/api/v1/telemetry", json=unregistered_telemetry)
        print(f"Telemetry response (unregistered): {resp.status_code} - {resp.json()}")

    # 5. Wait a bit for async processing
    await asyncio.sleep(1)

    # 6. Check final stats
    print("Fetching final stats...")
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base_url}/api/v1/stats")
        final_stats = resp.json()["stats"]
        print(f"Final stats: {final_stats}")

    # 7. Verification
    diff_total = final_stats["totalRequests"] - initial_stats["totalRequests"]
    print(f"\nTotal Requests Increment: {diff_total}")
    
    if diff_total == 1:
        print("[SUCCESS] Counting logic is working correctly!")
    else:
        print(f"[FAILURE] Expected increment of 1, but got {diff_total}.")

if __name__ == "__main__":
    asyncio.run(test_verification())
