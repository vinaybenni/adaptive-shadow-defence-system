from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

# --- Agent 1: Risk Scoring ---

class RequestMetadata(BaseModel):
    timestamp: str 
    client_ip: str
    request_id: Optional[str] = None # Unique ID for de-duplication
    method: str
    path: str
    host: str
    full_url: Optional[str] = ""
    payload: Optional[str] = ""
    headers: Dict[str, str] = {}
    cookies: Dict[str, str] = {}
    session_id: Optional[str] = None
    auth_result: Optional[str] = "none" # failure, success, none
    payload_size: int = 0

class RiskAssessment(BaseModel):
    risk: str # LOW, MEDIUM, HIGH
    score: int
    tags: List[str]
    explain: str

# --- Agent 2: Traffic Routing ---

class RoutingDecision(BaseModel):
    timestamp: str
    client_ip: str
    path: str
    risk: str
    selected_target: str # real, shadow, hardened
    target_upstream: str
    routing_id: str

# --- Agent 3: Shadow Activity ---

class AttackerLog(BaseModel):
    timestamp: str
    attacker_ip: str
    shadow_host: str
    path: str
    method: str
    payload: Optional[str] = None
    detected_exploit: List[str] = []
    session: Optional[str] = None
    notes: Optional[str] = None

class ShadowLog(BaseModel):
    """Schema for shadow environment logs sent to frontend"""
    timestamp: str
    attacker_ip: str
    shadow_host: str
    path: str
    payload: Optional[str] = None
    user_agent: str
    source: Optional[str] = None  # "agent3" for direct hits, "telemetry" for redirected hits

# --- Agent 4: Rule Updates ---

class RuleUpdateProposal(BaseModel):
    timestamp: str
    proposed_by: str = "agent4"
    change_summary: str
    diff: str # JSON or diff string
    impact_estimate: Dict[str, float]

# --- Config Models ---

class AppConfig(BaseModel):
    name: str
    domain: str
    real_upstream: str
    hardened_upstream: Optional[str] = None
    shadow_upstream: Optional[str] = None
    protection_enabled: bool = True
