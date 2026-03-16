import sys
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, Request, BackgroundTasks
from pydantic import BaseModel

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from shared.logger import setup_logger, log_error
from shared.messaging import RedisClient
from shared.schemas import RequestMetadata, RiskAssessment
from risk_engine import RiskEngine

logger = setup_logger("agent1.main", "logs/agent1/service.log")
risk_engine = RiskEngine()
redis_client = RedisClient()

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    await redis_client.connect()

@app.on_event("shutdown")
async def shutdown_event():
    await redis_client.close()

@app.post("/api/v1/score", response_model=RiskAssessment)
async def score_request(meta: RequestMetadata, background_tasks: BackgroundTasks):
    logger.info(f"Received scoring request for {meta.client_ip} to {meta.path}")
    
    try:
        # Calculate Risk
        assessment = risk_engine.evaluate(meta)
        
        # Publish Event
        # Publish Event
        event_data = {
            "client_ip": meta.client_ip,
            "request_id": meta.request_id,
            "risk": assessment.risk,
            "score": assessment.score,
            "tags": assessment.tags,
            "explain": assessment.explain,
            "timestamp": meta.timestamp
        }
        try:
            await redis_client.publish("risk.events", event_data)
        except Exception as e:
            logger.error(f"Failed to publish risk event: {e}")
        
        logger.info(f"Scored: {assessment.risk} ({assessment.score}) for {meta.client_ip}")
        return assessment
        
    except Exception as e:
        log_error(logger, "Scoring error", e, extra={"client_ip": meta.client_ip})
        return RiskAssessment(risk="LOW", score=0, tags=["error"], explain="Internal error")

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
