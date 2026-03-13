import httpx
import asyncio
import json

async def get_apps():
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://localhost:8010/api/v1/apps")
        print(json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(get_apps())
