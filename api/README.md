# Pricing API

FastAPI proxy between the dashboard and Google Sheets.
Credentials stay server-side. Responses are cached for 5 minutes.

## Setup

```bash
cd api
pip install -r requirements.txt
cp .env.example .env   # edit if needed
```

## Run locally

```bash
uvicorn main:app --reload --port 8000
```

## Endpoints

| Endpoint      | Description                              |
|---------------|------------------------------------------|
| GET /api/health | Health check                           |
| GET /api/rates  | All pricing rate constants (live)      |
| GET /api/data   | Full product catalog (live)            |

## Dashboard integration

Set `VITE_API_URL` in `dashboard/.env`:

```
VITE_API_URL=http://localhost:8000
```

If the API is unreachable, the dashboard automatically falls back to
the static `dashboard/public/data.json` and `rates.json` files.

## Deploy (Render / Railway / Fly.io)

1. Point the service root to the `api/` folder
2. Set env vars: `GOOGLE_CREDS_FILE`, `SHEET_KEY`, `CACHE_TTL_SECONDS`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. Update `VITE_API_URL` in your dashboard deployment to the live API URL
