"""
Simple in-memory cache with TTL.
Fetches from Google Sheets once, then serves cached data for CACHE_TTL seconds.
"""

import time
import os
import sys

# Allow importing sheets.py from same folder
sys.path.insert(0, os.path.dirname(__file__))
from sheets import fetch_rates, fetch_data

CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", 300))  # default 5 minutes

_cache: dict = {}


def _get(key: str, fetcher):
    entry = _cache.get(key)
    now = time.time()
    if entry and (now - entry["ts"]) < CACHE_TTL:
        print(f"[cache] HIT  {key} (age {int(now - entry['ts'])}s)")
        return entry["data"]
    print(f"[cache] MISS {key} — fetching from Google Sheets...")
    data = fetcher()
    _cache[key] = {"data": data, "ts": now}
    return data


def cached_rates():
    return _get("rates", fetch_rates)


def cached_data():
    return _get("data", fetch_data)
