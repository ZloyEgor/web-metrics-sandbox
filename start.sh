#!/bin/bash

echo "==================================="
echo "Low-Code Platforms Sandbox Starter"
echo "==================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd metrics-collector
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd sandbox-app
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo ""
echo "==================================="
echo "Starting services..."
echo "==================================="
echo ""

# Start backend in background
echo "🚀 Starting backend server (port 4000)..."
cd metrics-collector
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend in background
echo "🚀 Starting frontend server (port 5173)..."
cd sandbox-app
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==================================="
echo "✅ Services Started!"
echo "==================================="
echo ""
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:4000"
echo ""
echo "To start Docker platforms:"
echo "  cd docker && docker-compose up -d"
echo ""
echo "To stop services, press Ctrl+C"
echo "==================================="

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

wait
