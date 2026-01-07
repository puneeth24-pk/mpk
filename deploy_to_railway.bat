@echo off
echo ========================================
echo   Luna Book - Railway Deployment
echo ========================================
echo.

echo [1/4] Adding new files to Git...
git add railway.json nixpacks.toml RAILWAY_DEPLOYMENT.md package.json
echo ✓ Files staged

echo.
echo [2/4] Committing changes...
git commit -m "Add Railway deployment configuration"
if %ERRORLEVEL% EQU 0 (
    echo ✓ Changes committed
) else (
    echo ! No changes to commit or commit failed
)

echo.
echo [3/4] Pushing to GitHub...
git push origin main
if %ERRORLEVEL% EQU 0 (
    echo ✓ Pushed to GitHub
) else (
    echo ! Push failed - check your GitHub connection
    pause
    exit /b 1
)

echo.
echo [4/4] Opening Railway Dashboard...
start https://railway.app

echo.
echo ========================================
echo   Next Steps:
echo ========================================
echo 1. In Railway Dashboard, click "New Project"
echo 2. Select "Deploy from GitHub repo"
echo 3. Choose your repository
echo 4. Railway will auto-deploy!
echo.
echo For detailed instructions, see RAILWAY_DEPLOYMENT.md
echo ========================================
echo.
pause
