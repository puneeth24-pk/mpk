# 🚂 Railway Deployment Guide for Luna Book

Complete guide to deploy Luna Book to Railway with full Python kernel support, WebSockets, and PWA features.

## Prerequisites

✅ Railway account (https://railway.app)  
✅ GitHub account  
✅ Git installed locally  
✅ Luna Book project ready

## Step 1: Prepare Your Repository

### Initialize Git (if not already done)

```bash
cd "c:\Users\mandl\Downloads\numpy book"
git init
git add .
git commit -m "Initial commit - Luna Book ready for Railway"
```

### Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `luna-book`)
3. **Don't** initialize with README (we already have code)
4. Copy the repository URL

### Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/luna-book.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

### Option A: Deploy via Railway Dashboard (Recommended)

1. **Login to Railway**: Go to https://railway.app and sign in
2. **New Project**: Click "New Project"
3. **Deploy from GitHub**: Select "Deploy from GitHub repo"
4. **Authorize GitHub**: Grant Railway access to your repositories
5. **Select Repository**: Choose your `luna-book` repository
6. **Deploy**: Railway will automatically detect the configuration and start building

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to your repo
railway link

# Deploy
railway up
```

## Step 3: Configure Environment (Optional)

Railway automatically sets the `PORT` variable. No additional environment variables are required for basic deployment.

### Optional Environment Variables

If you want to customize:

```bash
# In Railway Dashboard > Variables
PYTHON_VERSION=3.11
NODE_VERSION=18
```

## Step 4: Verify Deployment

### Check Build Logs

1. Go to your Railway project dashboard
2. Click on the deployment
3. View "Build Logs" to ensure:
   - ✅ Python packages installed
   - ✅ Node.js dependencies installed
   - ✅ Frontend built successfully (`npm run build`)
   - ✅ Server started

### Check Deploy Logs

Monitor the "Deploy Logs" for:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:XXXX
```

### Access Your App

1. Railway will generate a URL like: `https://your-app.up.railway.app`
2. Click "Generate Domain" in the Settings tab if not auto-generated
3. Open the URL in your browser

## Step 5: Test Functionality

### ✅ Basic Tests

- [ ] **Homepage loads**: You should see Luna Book interface
- [ ] **WebSocket connects**: Status indicator shows "Connected (Server)"
- [ ] **Code execution**: Run a simple Python cell:
  ```python
  print("Hello from Railway!")
  ```
- [ ] **Input function**: Test interactive input:
  ```python
  name = input("Enter your name: ")
  print(f"Hello, {name}!")
  ```
- [ ] **Data science libraries**: Test NumPy/Pandas:
  ```python
  import numpy as np
  import pandas as pd
  print(np.__version__)
  print(pd.__version__)
  ```
- [ ] **Matplotlib**: Test plotting:
  ```python
  import matplotlib.pyplot as plt
  plt.plot([1, 2, 3, 4])
  plt.show()
  ```
- [ ] **File upload**: Upload a CSV file and read it
- [ ] **PWA install**: Check if install prompt appears (may require HTTPS)

## Troubleshooting

### Build Fails

**Error**: `npm: command not found`
- **Fix**: Ensure `nixpacks.toml` includes `nodejs-18_x`

**Error**: `ModuleNotFoundError: No module named 'jupyter_client'`
- **Fix**: Check `requirements.txt` is present and properly formatted

### WebSocket Connection Fails

**Error**: Status shows "Disconnected"
- **Fix**: Railway supports WebSockets by default. Check browser console for errors
- **Fix**: Ensure your app is using `wss://` (secure WebSocket) for HTTPS deployments

### Kernel Startup Timeout

**Error**: "Kernel failed to start"
- **Fix**: Railway free tier has memory limits. Upgrade plan if needed
- **Fix**: Check deploy logs for Python/Jupyter errors

### Port Binding Issues

**Error**: `Address already in use`
- **Fix**: Ensure `backend.py` uses Railway's `$PORT` variable (already configured in Procfile)

### Static Files Not Loading

**Error**: 404 on `/assets/*`
- **Fix**: Ensure `npm run build` completed successfully
- **Fix**: Check `dist` folder exists with built files

## Configuration Files Reference

### `railway.json`
Defines build and deployment configuration for Railway.

### `nixpacks.toml`
Specifies system dependencies (Python 3.11, Node.js 18, ZeroMQ).

### `Procfile`
Tells Railway how to start the application:
```
web: uvicorn backend:app --host 0.0.0.0 --port $PORT
```

### `requirements.txt`
Python dependencies for the backend.

### `package.json`
Node.js dependencies and build scripts for the frontend.

## Performance Tips

### Free Tier Limitations
- **Memory**: 512MB - 1GB (may limit concurrent users)
- **CPU**: Shared
- **Sleep**: Apps sleep after 5 minutes of inactivity

### Optimization
- Railway automatically scales on paid plans
- Each user gets an isolated Python kernel (memory intensive)
- Consider implementing kernel pooling for high traffic

## Updating Your Deployment

### Push Updates

```bash
git add .
git commit -m "Update: description of changes"
git push origin main
```

Railway automatically rebuilds and redeploys on every push to `main`.

### Rollback

In Railway Dashboard:
1. Go to Deployments
2. Find previous successful deployment
3. Click "Redeploy"

## Custom Domain (Optional)

1. Go to Railway project > Settings
2. Click "Generate Domain" or "Custom Domain"
3. Add your domain and configure DNS:
   - **CNAME**: Point to Railway's provided domain

## Monitoring

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: History of all deployments

### Application Health
Monitor your app at: `https://your-app.up.railway.app/docs` (FastAPI auto-docs)

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Luna Book Issues**: Create an issue in your GitHub repo

---

## Quick Reference Commands

```bash
# Build frontend locally (test before deploy)
npm run build

# Test backend locally
uvicorn backend:app --port 8020

# Check Railway deployment status
railway status

# View Railway logs
railway logs

# Open deployed app
railway open
```

---

**🎉 Congratulations!** Your Luna Book is now live on Railway! Share the URL with others to collaborate on Python notebooks in real-time.
