# --- Build Stage (Frontend) ---
FROM node:18-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Run Stage (Backend) ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for Jupyter and ZeroMQ
RUN apt-get update && apt-get install -y \
    gcc \
    libzmq3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python stack
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend from build stage
COPY --from=build-stage /app/dist ./dist

# Copy the rest of the application
COPY . .

# Ensure $PORT from Render/Railway is used
ENV PORT=8020
EXPOSE $PORT

# Run the backend
CMD ["python", "backend.py"]
