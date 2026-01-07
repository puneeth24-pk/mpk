# Render Deployment Configuration

## ⚠️ IMPORTANT: Manual Configuration Required

If the automatic deployment from `render.yaml` doesn't work, use these **exact settings** when creating your Web Service on Render:

### Service Settings

| Setting | Value |
|---------|-------|
| **Name** | `luna-book` |
| **Environment** | `Docker` |
| **Region** | Choose closest to you |
| **Branch** | `main` |

### Deployment via Docker

Render will automatically detect the `Dockerfile` in the root of your repository. This Dockerfile handles:
1.  **Frontend Build**: Compiling the React app into static files.
2.  **Backend Setup**: Installing Python 3.11 and the scientific stack.
3.  **Monolithic Run**: Serving both through FastAPI.

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
