@echo off
echo Starting Luna Book 🌙📘
echo.
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting the backend server...
echo Open your browser to: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
python backend.py