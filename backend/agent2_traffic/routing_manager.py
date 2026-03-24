import logging
import json
from typing import Dict, Optional, List
from shared.schemas import AppConfig, RoutingDecision

logger = logging.getLogger("agent2.manager")

class RoutingManager:
    def __init__(self, redis_client=None):
        # In-memory cache for performance, backed by Redis
        self.routes: Dict[str, AppConfig] = {}
        self.redis = redis_client
        self.redis_key = "agent2.apps"

    async def sync_from_redis(self):
        """Initial load of apps from Redis."""
        if not self.redis or not self.redis.redis:
            return

        try:
            stored_apps = await self.redis.redis.hgetall(self.redis_key)
            for domain, config_json in stored_apps.items():
                try:
                    config_data = json.loads(config_json)
                    self.routes[domain] = AppConfig(**config_data)
                except Exception as e:
                    logger.error(f"Failed to parse stored config for {domain}: {e}")
            logger.info(f"Synced {len(self.routes)} apps from Redis.")
        except Exception as e:
            logger.error(f"Failed to sync from Redis: {e}")

    async def add_or_update_app(self, config: AppConfig):
        # Sanitize domain for consistent lookups (strip protocol/path/ports)
        clean_domain = config.domain.replace("http://", "").replace("https://", "").split("/")[0]
        if ":" in clean_domain:
             clean_domain = clean_domain.split(":")[0]
             
        if clean_domain != config.domain:
            logger.warning(f"Sanitizing domain from '{config.domain}' to '{clean_domain}'")
            config.domain = clean_domain

        self.routes[config.domain] = config
        
        # Persist to Redis
        if self.redis and self.redis.redis:
            await self.redis.redis.hset(self.redis_key, config.domain, json.dumps(config.dict()))
            
        logger.info(f"Updated route for {config.domain}: Real={config.real_upstream}, Shadow={config.shadow_upstream} [Persisted]")

    async def remove_app(self, domain: str):
        if domain in self.routes:
            del self.routes[domain]
            
        if self.redis and self.redis.redis:
            await self.redis.redis.hdel(self.redis_key, domain)
            
        logger.info(f"Removed route for {domain} [Persisted]")

    def _sanitize_host(self, host: str) -> str:
        """Strip port and normalize host string."""
        if ":" in host:
            return host.split(":")[0]
        return host

    def is_shadow_url(self, full_url: str) -> bool:
        """Check if the given full URL belongs to a registered shadow environment."""
        if not full_url:
            return False
            
        full_url_lower = full_url.lower()
        
        # Check defaults
        if "localhost:8003" in full_url_lower:
            return True
            
        for config in self.routes.values():
            if not config.shadow_upstream:
                continue
            
            if full_url_lower.startswith(config.shadow_upstream.lower()):
                return True
        return False

    def get_route(self, host: str) -> Optional[AppConfig]:
        clean_host = self._sanitize_host(host)
        route = self.routes.get(clean_host)
        
        # Fallback: If not found and host looks like an IP (contains numbers), 
        # try matching against 'localhost'. This handles tests from other devices.
        if not route and any(c.isdigit() for c in clean_host):
            route = self.routes.get('localhost')
            
        return route

    def get_all_routes(self) -> List[AppConfig]:
        return list(self.routes.values())

    def decide_target(self, config: AppConfig, risk_score: int, risk_level: str) -> str:
        # Simple Protection Logic
        if not config.protection_enabled:
            return "real"
            
        if risk_level == "HIGH":
            # Always route high risk to shadow
            return "shadow"
            
        if risk_level == "MEDIUM" and config.hardened_upstream:
            return "hardened"

        return "real"

    def resolve_upstream(self, config: AppConfig, target_type: str) -> str:
        if target_type == "shadow":
            # HARD OVERRIDE: Forcing localhost tests to your new shadow environment
            if "localhost" in config.real_upstream:
                logger.warning(f"Forcing Shadow Target Override for localhost: http://localhost/DVWA-rnaster/")
                return "http://localhost/DVWA-rnaster/"
            return config.shadow_upstream or "http://localhost:8003"
        elif target_type == "hardened":
            return config.hardened_upstream
        else:
            return config.real_upstream
