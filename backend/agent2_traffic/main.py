import sys
import os
import logging
import asyncio
import httpx
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import re

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from shared.logger import setup_logger, log_error
from shared.messaging import RedisClient
from shared.schemas import RequestMetadata, RiskAssessment, AppConfig, ShadowLog
from routing_manager import RoutingManager

logger = setup_logger("agent2.main", "logs/agent2/service.log")
redis_client = RedisClient()
routing_manager = RoutingManager(redis_client)

app = FastAPI(title="AEGIS Telemetry & Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory=os.path.dirname(__file__)), name="static")

AGENT1_URL = "http://localhost:8001/api/v1/score"

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

_broadcast_task = None

@app.on_event("startup")
async def startup_event():
    global _broadcast_task
    await redis_client.connect()
    
    # Singleton guard: Prevent multiple listeners if startup runs twice
    if _broadcast_task is None:
        _broadcast_task = asyncio.create_task(broadcast_redis_events())
        logger.info("Agent 2 (Telemetry) Starting Singleton Broadcast Listener...")
    else:
        logger.warning("Agent 2 Startup: Broadcast listener already running. Skipping duplicate task.")

    # Sync routes from Redis
    await routing_manager.sync_from_redis()

@app.on_event("shutdown")
async def shutdown_event():
    await redis_client.close()

async def broadcast_redis_events():
    """Listens to Redis and broadcasts to all connected WebSockets."""
    logger.info("Started WebSocket Broadcast Listener")
    pubsub = redis_client.redis.pubsub()
    await pubsub.subscribe("risk.events", "login.success", "route.decisions", "agent4.proposals", "shadow.activity")
    
    async for message in pubsub.listen():
        if message['type'] == 'message':
            channel = message['channel']
            try:
                data = json.loads(message['data']) if isinstance(message['data'], str) else message['data']
                
                # Persistence: Store events for dashboard history
                if channel == "risk.events" or channel == "login.success":
                    log_entry = {"channel": channel, **data}
                    await redis_client.redis.lpush("dashboard.logs", json.dumps(log_entry))
                    await redis_client.redis.ltrim("dashboard.logs", 0, 99) # Keep last 100
                    
                    if channel == "risk.events":
                        client_ip = data.get('client_ip')
                        if client_ip:
                            # De-duplicate Suspicious Users
                            if data.get('score', 0) > 20:
                                is_new_suspicious = await redis_client.redis.sadd("stats.unique_suspicious_ips", client_ip)
                                if is_new_suspicious:
                                    await redis_client.redis.incr("stats.suspicious_users")
                            
                            # Increment Attacks Blocked for EVERY hit (requested by user)
                            if data.get('risk') == 'HIGH':
                                await redis_client.redis.incr("stats.attacks_blocked")
                                
                                # Tally specific attack types
                                tags = data.get('tags', [])
                                if not tags and data.get('score', 0) >= 90:
                                    tags = ["high_frequency"] # Fallback if no specific tag
                                
                                for tag in tags:
                                    # Use a Redis Hash to count attack types
                                    await redis_client.redis.hincrby("stats.attack_types", tag, 1)

                # Handle Shadow Activity specifically
                elif channel == "shadow.activity":
                    log_entry = {"channel": channel, **data}
                    await redis_client.redis.lpush("shadow.logs", json.dumps(log_entry))
                    await redis_client.redis.ltrim("shadow.logs", 0, 99) 
                    
                    
                    # 1. Deduplicate shadow counts: only count once per request per second
                    # We use IP + Path + Second to ensure Telemetry and Agent 3 hits collapse into 1 count
                    attacker_ip = data.get('attacker_ip') or data.get('client_ip')
                    path = data.get('path', 'root')
                    timestamp_sec = int(datetime.utcnow().timestamp())
                    
                    dedup_id = f"s:{attacker_ip}:{path}:{timestamp_sec}"
                    dedup_key = f"shadow_counted:{dedup_id}"
                    
                    is_new_shadow = await redis_client.redis.set(dedup_key, "1", ex=5, nx=True)
                    
                    if is_new_shadow:
                        await redis_client.redis.incr("stats.shadow_total")
                        logger.info(f"Shadow Monitor: Unique hit counted for {attacker_ip} -> {path}")
                    
                    # Track Unique Shadow IPs
                    attacker_ip = data.get('attacker_ip')
                    if attacker_ip:
                         await redis_client.redis.sadd("stats.shadow_unique_ips", attacker_ip)
                    
                    # Analyze for attack types (Local simple check to avoid cross-agent calls)
                    payload = data.get('payload', '').lower()
                    path = data.get('path', '').lower()
                    content = f"{path} {payload}"
                    
                    patterns = {
                        "sql_injection": r"(\'\s*(OR|AND)\s+[\'\"\d]|\bUNION\b|\bSELECT\b|--|\bOR\b\s+['\"]?1['\"]?\s*=\s*['\"]?1|SLEEP\s*\()",
                        "xss": r"(<script|alert\(|onerror|onload|javascript:|<iframe)",
                        "path_traversal": r"(\.\.\/|\.\.\\|/etc/passwd)",
                        "os_command": r"(&&|\|\||;|`|\$\(|ping|netstat|whoami|cat)"
                    }
                    
                    for atk_name, pattern in patterns.items():
                        if re.search(pattern, content, re.IGNORECASE):
                             await redis_client.redis.hincrby("stats.shadow_attack_types", atk_name, 1)

                # 3. Authoritative Stats Broadcast (For ALL channels)
                # Fetch latest stats to send with the message (authoritative)
                total = await redis_client.redis.get("stats.total_requests")
                normal = await redis_client.redis.get("stats.normal_users")
                suspicious = await redis_client.redis.get("stats.suspicious_users")
                blocked = await redis_client.redis.get("stats.attacks_blocked")
                
                # SHADOW STATS
                s_total = await redis_client.redis.get("stats.shadow_total")
                s_unique_ips = await redis_client.redis.scard("stats.shadow_unique_ips")
                s_attack_types = await redis_client.redis.hgetall("stats.shadow_attack_types")
                
                stats_payload = {
                    "totalRequests": int(total) if total else 0,
                    "normalUsers": int(normal) if normal else 0,
                    "suspiciousUsers": int(suspicious) if suspicious else 0,
                    "attacksBlocked": int(blocked) if blocked else 0,
                    "shadowStats": {
                        "totalRequests": int(s_total) if s_total else 0,
                        "uniqueAttackers": int(s_unique_ips) if s_unique_ips else 0,
                        "attackTypes": {k: int(v) for k, v in s_attack_types.items()} if s_attack_types else {},
                        "uniqueAttackTypes": len(s_attack_types) if s_attack_types else 0
                    }
                }
                
                # Fetch attack types tally
                raw_attack_types = await redis_client.redis.hgetall("stats.attack_types")
                stats_payload["attackTypes"] = {k: int(v) for k, v in raw_attack_types.items()} if raw_attack_types else {}
                stats_payload["uniqueAttackTypes"] = len(stats_payload["attackTypes"])

                # Use the original request_id as the msg_id for frontend de-duplication
                msg = {
                    "channel": channel, 
                    "msg_id": data.get("request_id") or data.get("msg_id"), # Prefer original ID
                    "stats": stats_payload,
                    **data
                }
                await manager.broadcast(msg)
            except Exception as e:
                logger.error(f"Broadcast error on {channel or 'unknown'}: {e}")

# --- Telemetry Handler ---

@app.post("/api/v1/telemetry")
async def receive_telemetry(request: Request):
    import uuid
    try:
        data = await request.json()
    except:
        return {"error": "Invalid JSON"}
    
    # Capture real client IP
    client_ip = request.client.host
    data['client_ip'] = client_ip
    
    request_id = str(uuid.uuid4())
    data['request_id'] = request_id
    logger.info(f"Telemetry [{request_id}]: {data.get('event')} from {client_ip}")
    
    action = "none"

    # Check Blocklist
    is_blocked = await redis_client.redis.sismember("security.blocklist", data.get('client_ip', '').strip())
    if is_blocked:
        logger.warning(f"BLOCKED IP attempt: {data.get('client_ip')}")
        return {"status": "blocked", "action": "block", "url": ""}

    payload_str = data.get('payload', '')
    payload_size = len(payload_str.encode()) if payload_str else 0

    # 1. SHADOW INGRESS (Existing hits on shadow URLs)
    is_shadow = routing_manager.is_shadow_url(data.get('full_url', ''))
    if is_shadow:
        attacker_ip = data.get("client_ip", "unknown")
        if attacker_ip != "unknown":
            await redis_client.redis.sadd("stats.shadow_unique_ips", attacker_ip)

        shadow_log = {
            "attacker_ip": attacker_ip,
            "timestamp": data.get("timestamp", datetime.utcnow().isoformat() + "Z"),
            "shadow_host": data.get("host", "unknown"),
            "path": data.get("path", "unknown"),
            "payload": data.get("payload", ""),
            "user_agent": data.get("user_agent", "unknown"),
            "source": "telemetry"
        }
        await redis_client.publish("shadow.activity", shadow_log)
        logger.info(f"Telemetry [{request_id}]: Shadow Hit recorded directly in Redis.")
        return {"status": "shadow activity recorded"}

    # 2. RISK SCORING (Before De-duplication to allow burst detection)
    meta = RequestMetadata(
        timestamp=datetime.utcnow().isoformat() + "Z",
        client_ip=data.get('client_ip'),
        request_id=str(request_id),
        method=data.get('method', 'GET'),
        path=data.get('path', '/'),
        host=data.get('host', 'localhost'),
        full_url=data.get('full_url', ''),
        payload=payload_str,
        headers=data.get('headers', {}),
        payload_size=payload_size
    )

    try:
        app_config = routing_manager.get_route(meta.host)
        if app_config:
            async with httpx.AsyncClient(timeout=10.0) as client:
                logger.info(f"Calling Agent 1 at {AGENT1_URL} for scoring...")
                resp = await client.post(AGENT1_URL, json=meta.dict())
                if resp.status_code == 200:
                    assessment_data = resp.json()
                    assessment = RiskAssessment(**assessment_data)
                    
                    # Log high risk immediately
                    if assessment.score > 20: 
                        logger.info(f"Telemetry [{request_id}]: Scored {assessment.score} ({assessment.risk})")

                    if assessment.score > 90:
                        target_type = routing_manager.decide_target(app_config, assessment.score, assessment.risk)
                        if app_config.protection_enabled:
                            url = routing_manager.resolve_upstream(app_config, target_type)
                            if "/DVWA-master/" in meta.full_url:
                                url = meta.full_url.replace("/DVWA-master/", "/DVWA-rnaster/")
                            
                            logger.warning(f"HIGH RISK Detected. Action: redirect to {url}")
                            action = "redirect"
                            # Fast return for immediate redirection
                            return {"status": "received", "action": action, "url": url}
    except Exception as e:
        logger.error(f"Scoring error: {e}")

    # 3. DE-DUPLICATION (For Statistics and Baseline logs)
    raw_path = data.get('path', '/')
    clean_path = raw_path.rstrip('/').split('/')[-1]
    path_for_dedup = clean_path if clean_path else 'root'
    event = data.get('event', 'hit')
    timestamp_sec = int(datetime.utcnow().timestamp())
    
    dedup_key = f"telemetry:dedup:{data.get('client_ip')}:{path_for_dedup}:{event}:{timestamp_sec}"
    is_duplicate = await redis_client.redis.get(dedup_key)
    
    if is_duplicate:
        logger.warning(f"Telemetry [{request_id}]: DUPLICATE IGNORED for stats - {data.get('client_ip')}")
        return {"status": "received", "action": "none"}
    
    await redis_client.redis.set(dedup_key, "1", ex=1)
    
    # 4. STATS INCREMENT
    await redis_client.redis.incr("stats.total_requests")
    
    # Baseline publication if unregistered
    if not routing_manager.get_route(meta.host):
        baseline_event = {
            "client_ip": data.get('client_ip'),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "path": data.get('path', '/'),
            "risk": "LOW",
            "score": 0,
            "tags": ["unregistered_host"],
            "explanation": f"Baseline traffic from unregistered host: {data.get('host')}",
            "method": data.get('method', 'GET'),
            "payload": data.get('payload', '')[:200],
            "host": data.get('host', 'unknown'),
            "action": "none",
            "msg_id": request_id
        }
        await redis_client.publish("risk.events", baseline_event)

    # Specific Event Handling
    if data.get('event') == 'login_success':
        dedup_login = f"seen_login:{client_ip}"
        if await redis_client.redis.set(dedup_login, "1", ex=60, nx=True):
            await redis_client.redis.incr("stats.normal_users")
            login_event = {
                "client_ip": data.get('client_ip'),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": data.get('path'),
                "event": "Successful Login",
                "msg_id": request_id,
                "status_code": 200,
                "channel": "login.success"
            }
            await redis_client.publish("login.success", login_event)

    return {"status": "received", "action": action, "url": url}

# --- Management API ---

@app.get("/api/v1/stats")
async def get_dashboard_stats():
    """Returns persisted stats and recent logs for dashboard initialization."""
    total = await redis_client.redis.get("stats.total_requests")
    normal = await redis_client.redis.get("stats.normal_users")
    suspicious = await redis_client.redis.get("stats.suspicious_users")
    blocked = await redis_client.redis.get("stats.attacks_blocked")
    
    stats = {
        "totalRequests": int(total) if total else 0,
        "normalUsers": int(normal) if normal else 0,
        "suspiciousUsers": int(suspicious) if suspicious else 0,
        "attacksBlocked": int(blocked) if blocked else 0
    }
    
    # Fetch attack types tally
    raw_attack_types = await redis_client.redis.hgetall("stats.attack_types")
    stats["attackTypes"] = {k: int(v) for k, v in raw_attack_types.items()} if raw_attack_types else {}
    stats["uniqueAttackTypes"] = len(stats["attackTypes"])
    
    # SHADOW STATS
    s_total = await redis_client.redis.get("stats.shadow_total")
    s_unique_ips = await redis_client.redis.scard("stats.shadow_unique_ips")
    s_attack_types = await redis_client.redis.hgetall("stats.shadow_attack_types")
    
    stats["shadowStats"] = {
        "totalRequests": int(s_total) if s_total else 0,
        "uniqueAttackers": int(s_unique_ips) if s_unique_ips else 0,
        "attackTypes": {k: int(v) for k, v in s_attack_types.items()} if s_attack_types else {},
        "uniqueAttackTypes": len(s_attack_types) if s_attack_types else 0
    }

    raw_logs = await redis_client.redis.lrange("dashboard.logs", 0, 49)
    logs = []
    for rl in raw_logs:
        try:
            logs.append(json.loads(rl))
        except:
            pass

    raw_shadow_logs = await redis_client.redis.lrange("shadow.logs", 0, 49)
    shadow_logs = []
    for rl in raw_shadow_logs:
        try:
             shadow_logs.append(json.loads(rl))
        except:
             pass
            
    return {"stats": stats, "logs": logs, "shadowLogs": shadow_logs}

@app.get("/api/v1/apps")
async def get_apps():
    return routing_manager.get_all_routes()

@app.post("/api/v1/apps")
async def add_app(config: AppConfig):
    logger.info(f"Adding/Updating app: {config.domain}")
    await routing_manager.add_or_update_app(config)
    return {"status": "ok"}

@app.get("/api/v1/logs/{agent_id}")
async def download_log(agent_id: str):
    """Serve log files for different agents with robust path resolution."""
    # Base directory is the project root
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
    
    agent_map = {
        "agent1": "agent1_risk",
        "agent2": "agent2_traffic",
        "agent3": "agent3_shadow",
        "agent4": "agent4_learning",
    }
    
    internal_id = agent_id.lower()
    if internal_id not in agent_map:
        return JSONResponse(status_code=400, content={"error": "Invalid agent ID"})
    
    agent_subdir = agent_map[internal_id]
    
    # Check multiple possible locations for the log file
    possible_paths = [
        # 1. Local logs directory within agent folder (most common if run via run.bat)
        os.path.join(base_dir, "backend", agent_subdir, "logs", internal_id, "service.log"),
        # 2. Project root logs directory
        os.path.join(base_dir, "logs", internal_id, "service.log"),
        # 3. Direct agent folder service.log (old fallback)
        os.path.join(base_dir, "backend", agent_subdir, "service.log")
    ]
    
    for abs_path in possible_paths:
        if os.path.exists(abs_path):
            logger.info(f"Serving log download for {agent_id}: {abs_path}")
            return FileResponse(abs_path, filename=f"{internal_id}_service.log")
        
    logger.error(f"Log file NOT FOUND for {agent_id} in any searched location: {possible_paths}")
    return JSONResponse(status_code=404, content={"error": f"Log file for {agent_id} not found on server"})

@app.delete("/api/v1/apps/{domain}")
async def delete_app(domain: str):
    logger.info(f"Deleting app: {domain}")
    await routing_manager.remove_app(domain)
    return {"status": "ok"}

@app.post("/api/v1/stats/reset")
async def reset_stats():
    """Resets all dashboard statistics and clears logs."""
    logger.info("Resetting dashboard statistics and logs...")
    
    # 1. Reset counters
    await redis_client.redis.set("stats.total_requests", "0")
    await redis_client.redis.set("stats.normal_users", "0")
    await redis_client.redis.set("stats.suspicious_users", "0")
    await redis_client.redis.set("stats.attacks_blocked", "0")
    
    # 2. Clear lists and sets
    await redis_client.redis.delete("dashboard.logs")
    await redis_client.redis.delete("stats.unique_suspicious_ips")
    await redis_client.redis.delete("stats.attack_types")
    
    # 3. Broadcast clear event to all clients
    clear_event = {
        "channel": "stats.clear",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "stats": {
            "totalRequests": 0,
            "normalUsers": 0,
            "suspiciousUsers": 0,
            "attacksBlocked": 0,
            "attackTypes": {},
            "shadowStats": {
                "totalRequests": 0,
                "uniqueAttackers": 0,
                "attackTypes": {},
                "uniqueAttackTypes": 0
            }
        }
    }
    await redis_client.redis.delete("shadow.logs")
    await redis_client.redis.delete("stats.shadow_total")
    await redis_client.redis.delete("stats.shadow_unique_ips")
    await redis_client.redis.delete("stats.shadow_attack_types")
    await manager.broadcast(clear_event)
    
    return {"status": "ok", "message": "Dashboard data cleared"}

# --- IP Blocklist API ---

@app.get("/api/v1/blocklist")
async def get_blocklist():
    ips = await redis_client.redis.smembers("security.blocklist")
    return list(ips)

@app.post("/api/v1/block")
async def block_ip(payload: Dict):
    ip = payload.get("ip")
    if ip:
        ip = ip.strip()
        await redis_client.redis.sadd("security.blocklist", ip)
        logger.warning(f"IP Blocked by Admin: {ip}")
    return {"status": "ok"}

@app.delete("/api/v1/block/{ip}")
async def unblock_ip(ip: str):
    ip = ip.strip()
    await redis_client.redis.srem("security.blocklist", ip)
    logger.info(f"IP Unblocked: {ip}")
    return {"status": "ok"}

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
