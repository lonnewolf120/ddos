#!/bin/bash

# DDoS Visualization Dashboard - Quick Start Script
# Starts both the backend API and frontend development servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       DDoS Visualization Dashboard - Quick Start               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if backend venv exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo "✅ Virtual environment created and dependencies installed"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Node.js dependencies installed"
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo ""
echo "🚀 Starting Backend API (port 8841)..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo ""
echo "🚀 Starting Frontend (port 3000)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Services Started Successfully!                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Frontend:  http://localhost:3000                              ║"
echo "║  Backend:   http://localhost:8841                              ║"
echo "║  API Docs:  http://localhost:8841/docs                         ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Press Ctrl+C to stop all services                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Wait for both processes
wait
