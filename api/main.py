"""
Pricing API — FastAPI proxy between the dashboard and Google Sheets.
Keeps credentials server-side. Caches responses for 5 minutes.

Endpoints:
  GET /api/rates  → lamination rates, printing table, material rates
  GET /api/data   → full product catalog (categories → sub-categories → products)
  GET /api/health → health check
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from cache import cached_rates, cached_data

BASE_DIR = os.path.dirname(__file__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Pricing API starting up...")
    yield
    print("Pricing API shutting down.")


app = FastAPI(title="Pricing API", version="1.0.0", lifespan=lifespan)

# Allow the Vite dev server and any deployed frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://localhost:8001", "*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/refresh")
def refresh():
    """Clear the cache and force a fresh fetch from Google Sheets on next request."""
    from cache import _cache
    _cache.clear()
    return {"status": "cache cleared", "message": "Next request will fetch fresh data from Google Sheets"}


@app.get("/api/rates")
def get_rates():
    """Return all pricing rate constants from Google Sheets (Price sheet)."""
    try:
        return cached_rates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data")
def get_data():
    """Return full product catalog from Google Sheets (ALLDATA sheet)."""
    try:
        return cached_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
