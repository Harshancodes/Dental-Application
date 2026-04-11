"""
Shared rate limiter instance.
Both main.py and routers import from here to ensure
there is only one Limiter — otherwise each module gets
its own in-memory counter and limits don't work correctly.
"""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address

REDIS_URL = os.getenv("REDIS_URL", "")

if REDIS_URL:
    # Production: store counters in Redis so all Gunicorn workers share state
    # Without Redis, each worker has its own counter — a user could make
    # 10 * num_workers attempts per minute by hitting different workers
    from slowapi.wrappers import storage_options  # noqa
    limiter = Limiter(key_func=get_remote_address, storage_uri=REDIS_URL)
else:
    # Development: in-memory storage (fine for single worker)
    limiter = Limiter(key_func=get_remote_address)
