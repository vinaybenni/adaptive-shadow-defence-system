import sys
import os
import asyncio
import json
from collections import defaultdict
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from shared.messaging import RedisClient
from shared.logger import setup_logger
from shared.schemas import RuleUpdateProposal

logger = setup_logger("agent4.learning", "logs/agent4/service.log")
redis_client = RedisClient()

# In-memory learning state
stats = defaultdict(int)

async def handle_risk_event(data):
    logger.info(f"Learning agent analyzing event from {data.get('client_ip')}")
    
    # Track diverse traffic
    stats["total_hits"] += 1
    
    # Detect patterns (e.g., SQLi patterns)
    if any("sql" in tag.lower() for tag in data.get("tags", [])):
        stats["sql_attempts"] += 1
        
    await check_thresholds()

async def handle_login_success(data):
    stats["successful_logins"] += 1
    logger.info(f"Learning agent noted successful login from {data.get('client_ip')}")

async def check_thresholds():
    # If we see many SQL attempts, propose a "Strict Mode" rule
    if stats["sql_attempts"] >= 3 and not stats.get("strict_mode_proposed"):
        proposal = RuleUpdateProposal(
            timestamp=datetime.utcnow().isoformat() + "Z",
            change_summary="Enable SQLi Detection Strict Mode",
            diff="sqli_sensitivity: high\nblock_aggressive: true",
            impact_estimate={"true_positive_increase": 0.15}
        )
        await redis_client.publish("agent4.proposals", proposal.dict())
        logger.info("Proposed: SQLi Strict Mode based on patterns.")
        stats["strict_mode_proposed"] = True

async def main():
    logger.info("Agent 4 (Learning) Starting...")
    await redis_client.connect()
    
    # Use separate tasks for each subscription using isolated pubsub objects
    asyncio.create_task(redis_client.subscribe_isolated("risk.events", handle_risk_event))
    asyncio.create_task(redis_client.subscribe_isolated("login.success", handle_login_success))
    
    logger.info("Agent 4 active and learning from telemetry.")
    
    while True:
        await asyncio.sleep(10)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
