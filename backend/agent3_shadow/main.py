import sys
import os
import asyncio
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from shared.messaging import RedisClient
from shared.logger import setup_logger
from shared.schemas import AttackerLog

logger = setup_logger("agent3.shadow", "logs/agent3/service.log")
redis_client = RedisClient()

app = FastAPI()

@app.on_event("startup")
async def startup():
    logger.info("Agent 3 (Shadow) Starting...")
    await redis_client.connect()

@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def catch_all(request: Request, path: str):
    # Log the interaction
    body = await request.body()
    try:
        body_str = body.decode('utf-8')
    except:
        body_str = "<binary>"

    log_entry = AttackerLog(
        timestamp=datetime.utcnow().isoformat() + "Z",
        attacker_ip=request.client.host,
        shadow_host=request.headers.get("host", "unknown"),
        path=path,
        method=request.method,
        payload=body_str[:1000],  # Truncate
        user_agent=request.headers.get("user-agent", "unknown"),
        notes="Trapped in shadow environment"
    )
    
    # Async publish
    asyncio.create_task(redis_client.publish("shadow.activity", log_entry.dict()))
    
    logger.info(f"Trapped request from {request.client.host} to {path}")

    # Return fake content
    if "login" in path:
        return HTMLResponse(content="""
            <html>
                <body>
                    <h1>Login</h1>
                    <form method="POST">
                        <input type="text" name="username" placeholder="Username"><br>
                        <input type="password" name="password" placeholder="Password"><br>
                        <button type="submit">Login</button>
                    </form>
                    <!-- Invalid credentials -->
                </body>
            </html>
        """)
    elif "admin" in path:
         return HTMLResponse(content="<h1>Admin Panel</h1><p>Access Denied. IP Logged.</p>", status_code=403)
    
    return JSONResponse(content={"status": "error", "message": "Internal Server Error"}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    # Agent 3 runs on port 8003
    uvicorn.run(app, host="0.0.0.0", port=8003)
