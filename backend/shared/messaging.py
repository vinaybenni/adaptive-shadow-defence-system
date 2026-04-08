import redis.asyncio as redis
import json
import logging
import asyncio
from typing import Optional, Callable, Awaitable

logger = logging.getLogger("shared.messaging")

class RedisClient:
    def __init__(self, host='localhost', port=6379, db=0):
        self.redis_url = f"redis://{host}:{port}/{db}"
        self.redis: Optional[redis.Redis] = None
        self.pubsub = None

    async def connect(self):
        if not self.redis:
            self.redis = redis.from_url(self.redis_url, decode_responses=True)
            try:
                await self.redis.ping()
                logger.info("Connected to Redis")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise

    async def publish(self, channel: str, message: dict):
        if not self.redis:
            await self.connect()
        try:
            await self.redis.publish(channel, json.dumps(message))
        except Exception as e:
            logger.error(f"Error publishing to {channel}: {e}")
        
    async def subscribe_isolated(self, channel: str, callback: Callable[[dict], Awaitable[None]]):
        """Subscribe to a channel using a dedicated pubsub instance to avoid concurrency issues."""
        if not self.redis:
            await self.connect()
        
        local_pubsub = self.redis.pubsub()
        await local_pubsub.subscribe(channel)
        logger.info(f"Subscribed (isolated) to {channel}")

        try:
            async for message in local_pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        await callback(data)
                    except Exception as e:
                        logger.error(f"Error in isolated listener for {channel}: {e}")
        finally:
            await local_pubsub.close()

    async def close(self):
        if self.pubsub:
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()
