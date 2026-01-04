# Render Deployment Configuration

## ⚠️ IMPORTANT: Manual Configuration Required

If the automatic deployment from `render.yaml` doesn't work, use these **exact settings** when creating your Web Service on Render:

### Service Settings

| Setting | Value |
|---------|-------|
| **Name** | `luna-book` |
| **Environment** | `Python 3` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn backend:app --host 0.0.0.0 --port $PORT` |

### Critical: Start Command

**DO NOT** let Render auto-detect the start command. It will try to use `gunicorn` which is for Django/WSGI apps.

**You MUST manually enter:**
```bash
uvicorn backend:app --host 0.0.0.0 --port $PORT
```

### Environment Variables

No environment variables are required. Render automatically provides `$PORT`.

### Health Check

- **Health Check Path**: `/`

---

## Why This Happens

- Render auto-detects Python frameworks
- It sees Python files and assumes Django/Flask (WSGI)
- Tries to use `gunicorn` instead of `uvicorn` (ASGI)
- FastAPI requires `uvicorn` (ASGI server)

## Solution

Always explicitly set the start command to use `uvicorn`.
