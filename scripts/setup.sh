#!/bin/bash

echo "🚀 Configurando Oficina Manager..."

echo "📦 Instalando dependências do backend..."
cd backend && bun install

echo "📦 Instalando dependências do frontend..."
cd ../frontend && npm install

echo "🐳 Iniciando serviços Docker..."
cd ..
docker-compose up -d

echo "⏳ Aguardando PostgreSQL ficar pronto..."
sleep 5

echo "🗄️ Executando migrations..."
cd backend && bun run migrate

echo "🌱 Populando banco de dados..."
bun run seed

echo "✅ Setup concluído!"
echo ""
echo "Para iniciar o sistema:"
echo "  Terminal 1: cd backend && bun run dev"
echo "  Terminal 2: cd backend && bun run worker"
echo "  Terminal 3: cd frontend && npm run dev"