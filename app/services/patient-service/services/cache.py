"""
Simple Redis cache helper.
Falls back to a no-op if Redis is not configured (development without Redis).
"""
import os
import json
import logging
import functools

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "")

_redis = None


def get_redis():
    """Get Redis client, creating it on first call."""
    global _redis
    if _redis is None and REDIS_URL:
        try:
            import redis
            _redis = redis.from_url(REDIS_URL, decode_responses=True)
            _redis.ping()
            logger.info("Redis connected: %s", REDIS_URL)
        except Exception as e:
            logger.warning("Redis unavailable, caching disabled: %s", e)
            _redis = None
    return _redis


def cache_get(key: str):
    """Get a value from cache. Returns None if not found or Redis unavailable."""
    r = get_redis()
    if not r:
        return None
    try:
        value = r.get(key)
        return json.loads(value) if value else None
    except Exception as e:
        logger.warning("Cache get failed for %s: %s", key, e)
        return None


def cache_set(key: str, value, ttl_seconds: int = 600):
    """Store a value in cache with a TTL (default 10 minutes)."""
    r = get_redis()
    if not r:
        return
    try:
        r.setex(key, ttl_seconds, json.dumps(value))
    except Exception as e:
        logger.warning("Cache set failed for %s: %s", key, e)


def cache_delete(key: str):
    """Delete a key from cache."""
    r = get_redis()
    if not r:
        return
    try:
        r.delete(key)
    except Exception as e:
        logger.warning("Cache delete failed for %s: %s", key, e)


def cache_delete_pattern(pattern: str):
    """Delete all keys matching a pattern (e.g. 'ai:summary:*')."""
    r = get_redis()
    if not r:
        return
    try:
        keys = r.keys(pattern)
        if keys:
            r.delete(*keys)
    except Exception as e:
        logger.warning("Cache delete pattern failed for %s: %s", pattern, e)
