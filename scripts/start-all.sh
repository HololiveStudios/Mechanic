#!/bin/bash

echo "🚀 Iniciando todos os serviços..."

cd backend
bun run dev &
BACKEND_PID=$!

bun run worker &
WORKER_PID=$!

cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Serviços iniciados!"
echo "Backend PID: $BACKEND_PID"
echo "Worker PID: $WORKER_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Para parar: kill $BACKEND_PID $WORKER_PID $FRONTEND_PID"