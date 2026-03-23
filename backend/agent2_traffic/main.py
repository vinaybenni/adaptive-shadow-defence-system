import sys
import os
import logging
import asyncio
import httpx
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import re

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from shared.logger import setup_logger, log_error
from shared.messaging import RedisClient
from shared.schemas import RequestMetadata, RiskAssessment, AppConfig
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
                    
                    # Increment Shadow Total
                    await redis_client.redis.incr("stats.shadow_total")
                    
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
async def receive_telemetry(data: dict, request: Request):
    import uuid
    # Capture real client IP from the request
    client_ip = request.client.host
    data['client_ip'] = client_ip
    
    # Use UUID to ensure rapid requests aren't counted as duplicates
    request_id = str(uuid.uuid4())
    data['request_id'] = request_id
    logger.info(f"Telemetry [{request_id}]: {data.get('event')} from {client_ip}")
    
    action = "none"
    url = ""

    # Check Blocklist
    is_blocked = await redis_client.redis.sismember("security.blocklist", data.get('client_ip', '').strip())
    if is_blocked:
        logger.warning(f"BLOCKED IP attempt: {data.get('client_ip')}")
        return {"status": "blocked", "action": "block", "url": ""}

    # Filter Shadow Traffic: Ignore any telemetry from the shadow environment
    full_url = data.get('full_url', '')
    if routing_manager.is_shadow_url(full_url):
        logger.info(f"Shadow Bypasser: Ignoring telemetry from shadow environment: {full_url}")
        return {"status": "ignored", "action": "none"}

    payload_str = data.get('payload', '')
    payload_size = len(payload_str.encode()) if payload_str else 0

    if data.get('event') == 'hit':
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
            payload_size=data.get('payload_size', payload_size)
        )
        
        # Try to score synchronously for immediate redirect
        try:
            # ONLY SCORE AND PUBLISH IF REGISTERED
            app_config = routing_manager.get_route(meta.host)
            logger.info(f"App config for {meta.host}: {'Found' if app_config else 'Not Found'}")
            if app_config:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    logger.info(f"Calling Agent 1 at {AGENT1_URL} for scoring...")
                    resp = await client.post(AGENT1_URL, json=meta.dict())
                    logger.info(f"Agent 1 response: {resp.status_code}")
                    if resp.status_code == 200:
                        assessment = RiskAssessment(**resp.json())
                        if assessment.risk == "HIGH":
                            # Decide target and resolve URL
                            target_type = routing_manager.decide_target(app_config, assessment.score, assessment.risk)
                            url = routing_manager.resolve_upstream(app_config, target_type)
                            
                            # BREAK REDIRECT LOOP
                            current_full_url = data.get('full_url', '').lower()
                            target_url_lower = url.lower() if url else ''
                            
                            if target_type != 'real' and target_url_lower and current_full_url.startswith(target_url_lower):
                                logger.info(f"User is already on {target_type} environment ({url}). Skipping redirect loop.")
                                action = "none"
                            else:
                                if target_type == 'shadow' and app_config.shadow_upstream:
                                    # Use the registered shadow URL directly (as requested by user)
                                    url = app_config.shadow_upstream
                                    
                                    # Preserve query string if present in original request
                                    if "?" in meta.full_url:
                                        query_string = meta.full_url.split("?", 1)[1]
                                        if "?" in url:
                                            url += "&" + query_string
                                        else:
                                            url += "?" + query_string

                                
                                action = "redirect"
                                
                                # Dynamic Host Swap for Cross-Device Support
                                from urllib.parse import urlparse, urlunparse
                                try:
                                    parsed_url = urlparse(url)
                                    client_host = meta.host # The host the user is currently using (IP or localhost)
                                    
                                    if parsed_url.hostname == 'localhost' and client_host != 'localhost':
                                        # Swap localhost with the actual IP/Host used by the client
                                        new_netloc = client_host
                                        if parsed_url.port:
                                            new_netloc += f":{parsed_url.port}"
                                        url = urlunparse(parsed_url._replace(netloc=new_netloc))
                                except Exception as e:
                                    logger.error(f"Host swap error: {e}")

                                logger.warning(f"HIGH RISK detected for {meta.client_ip} on {meta.host}. Redirecting to {target_type} at {url}")
            else:
                logger.info(f"Host {meta.host} unregistered. Skipping scoring and risk publication.")
        except Exception as e:
            logger.error(f"Scoring error in telemetry: ({type(e).__name__}) {str(e)}")

        # Process Scoring Result (if scored)
        # (This block was not changed, just indicating placement)

        # COUNT EVERY REQUEST: We no longer deduplicate standard 'hit' events because 
        # page load + form submission happen rapidly and should count as 2 separate requests.
        if routing_manager.get_route(meta.host):
            # PERSISTENCE: Increment total stats for every single hit
            await redis_client.redis.incr("stats.total_requests")
        else:
            logger.info(f"Telemetry [{request_id}]: Host {meta.host} not registered. Skipping stats increment.")

    elif data.get('event') == 'login_success':
        # DE-DUPLICATION CHECK: Only count login_success once per visit
        # We use client_ip and path to prevent multiple rapid login pulses from inflating user count
        dedup_key = f"seen_login:{client_ip}"
        is_new = await redis_client.redis.set(dedup_key, "1", ex=60, nx=True)
        if is_new:
            # ONLY COUNT IF REGISTERED
            host = data.get('host')
            if host and routing_manager.get_route(host):
                login_event = {
                    "client_ip": data.get('client_ip'),
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "path": data.get('path'),
                    "event": "Successful Login", # Explicitly set for UI filtering
                    "msg_id": request_id,
                    "status_code": 200,
                    "channel": "login.success"
                }
                # PERSISTENCE: Track success
                await redis_client.redis.incr("stats.normal_users")
                # Note: lpush is now centralized in the broadcast listener to avoid duplicates
                await redis_client.publish("login.success", login_event)
            else:
                logger.info(f"Telemetry [{request_id}]: Host {host} not registered. Skipping login stats.")
        else:
            logger.info(f"Telemetry [{request_id}]: Duplicate login_success ignored.")

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
