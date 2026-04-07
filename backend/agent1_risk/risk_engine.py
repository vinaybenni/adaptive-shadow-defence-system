import re
import time
import urllib.parse
from collections import defaultdict
from shared.schemas import RequestMetadata, RiskAssessment

class RiskEngine:
    def __init__(self):
        # 1. Path Rules
        self.sensitive_paths = ["/admin", "/config", "/db", "/api/keys", "/etc/passwd", "/.env", "/phpinfo"]
        
        # 2. Attack Patterns (Regex)
        self.patterns = {
            "sql_injection": re.compile(
                r"(\'\s*(OR|AND)\b\s*[\'\"\d\)\(]|\bUNION\b.{0,20}\bSELECT\b|\bSELECT\b.{0,50}\bFROM\b|\bINSERT\b.{0,20}\bINTO\b|\bDROP\b.{0,20}\bTABLE\b|--|\bOR\b\s+['\"]?1['\"]?\s*=\s*['\"]?1|xp_cmdshell|WAITFOR\s+DELAY|SLEEP\s*\(|pg_sleep|benchmark|request_uri\s*\()", 
                re.IGNORECASE
            ),
            "xss": re.compile(r"(<script|alert\(|onerror|onload|javascript:|<iframe|document\.cookie|eval\(|unescape\()", re.IGNORECASE),
            "path_traversal": re.compile(r"(\.\.\/|\.\.\\|/etc/passwd|/windows/win\.ini|/boot\.ini)", re.IGNORECASE),
            "os_command": re.compile(r"(&&|\|\||`|\$\(|ping|netstat|whoami|cat|type)\b", re.IGNORECASE)
        }

        # 3. Suspicious Headers
        self.suspicious_headers = ["sqlmap", "nikto", "burp", "nmap", "hydra", "dirbuster"]

        # 4. Rate Limit Tracking
        self.request_history = defaultdict(list)
        self.rate_limit_threshold = 30  # requests per window (increased from 5)
        self.rate_limit_window = 10     # seconds (increased from 5)

    def evaluate(self, meta: RequestMetadata) -> RiskAssessment:
        score = 0
        tags = []
        explanation_parts = []

        # -- Rule 1: Path Analysis --
        for path in self.sensitive_paths:
            if path in meta.path:
                score += 40
                tags.append("sensitive_path")
                explanation_parts.append(f"Accessed sensitive path: {path}")
                break

        # -- Rule 2: Pattern Matching (Payload & Path) --
        raw_content = f"{meta.path} {meta.host} {meta.full_url} {meta.payload}".lower()
        content_to_check = urllib.parse.unquote_plus(raw_content)
        
        for attack_type, pattern in self.patterns.items():
            if pattern.search(content_to_check):
                score += 95 # Ensure it's HIGH risk (>=91)
                tags.append(attack_type)
                explanation_parts.append(f"Detected {attack_type} pattern in request content")

        # -- Rule 3: Header Analysis --
        for header, value in meta.headers.items():
            val_lower = str(value).lower()
            for susp in self.suspicious_headers:
                if susp in val_lower:
                    score += 50
                    tags.append("suspicious_tool")
                    explanation_parts.append(f"Detected suspicious tool {susp} in {header}")

        # -- Rule 4: Rate Limiting / High Frequency Detection --
        now = time.time()
        history_key = meta.client_ip
        
        # Clean old history
        self.request_history[history_key] = [t for t in self.request_history[history_key] if now - t < self.rate_limit_window]
        
        # Add current request
        self.request_history[history_key].append(now)
        
        if len(self.request_history[history_key]) >= self.rate_limit_threshold:
            score += 95 # Increased from 90 to ensure it is "more than 90"
            tags.append("high_frequency")
            explanation_parts.append(f"High frequency requests detected ({len(self.request_history[history_key])} in {self.rate_limit_window}s)")

        # -- Rule 5: Payload Anomalies --
        if meta.payload_size > 50000:
            score += 30
            tags.append("large_payload")
            explanation_parts.append("Large payload size detected")

        # Determine Risk Level
        risk_level = "LOW"
        if score >= 90:
            risk_level = "HIGH"

        return RiskAssessment(
            risk=risk_level,
            score=min(score, 100),
            tags=tags,
            explain="; ".join(explanation_parts) if explanation_parts else "Normal traffic"
        )
