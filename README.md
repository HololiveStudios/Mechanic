# Oficina Manager - Sistema de Gestão de Ordens de Serviço

Sistema completo para gestão de oficinas mecânicas com comunicação em tempo real, notificações push, fallback SMS/ligação e sincronização offline.

## 🚀 Stack Tecnológica

- **Backend**: Bun + TypeScript + PostgreSQL + Redis
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Mobile**: React Native + SQLite (offline-first)
- **Storage**: Firebase Storage
- **Notificações**: Firebase Cloud Messaging + Twilio (SMS/Call)
- **Real-time**: WebSocket + Redis Pub/Sub

## 📋 Pré-requisitos

- Node.js 18+ ou Bun
- Docker e Docker Compose
- PostgreSQL 15+
- Redis 7+
- Conta Firebase (para storage e push notifications)
- Conta Twilio (para SMS e chamadas)

## 🔧 Instalação e Configuração

### 1. Clone o repositório e instale dependências
```bash
# Backend
cd backend
bun install

# Frontend
cd ../frontend
npm install
```

### 2. Configure o Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative o Firebase Storage
4. Ative o Firebase Cloud Messaging
5. Baixe o arquivo de configuração:
   - Para web: copie as credenciais do SDK
   - Para admin: baixe a chave privada JSON

### 3. Configure o Twilio

1. Acesse o [Console do Twilio](https://console.twilio.com/)
2. Obtenha seu Account SID e Auth Token
3. Compre um número de telefone com capacidade de SMS e voz

### 4. Configure as variáveis de ambiente

Crie o arquivo `backend/.env`:
```env
DATABASE_URL=postgresql://oficina:oficina123@localhost:5432/oficina
REDIS_URL=redis://localhost:6379

JWT_SECRET=seu-jwt-secret-super-seguro-aqui-use-256-bits
JWT_REFRESH_SECRET=seu-refresh-secret-super-seguro-aqui-use-256-bits

FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+5511999999999

APP_URL=http://localhost:3000
PAYMENT_WEBHOOK_SECRET=seu-webhook-secret-aqui
```

### 5. Inicie os serviços de infraestrutura
```bash
# Na raiz do projeto
docker-compose up -d
```

### 6. Execute as migrações e seed
```bash
cd backend
bun run migrate
bun run seed
```

### 7. Inicie os servidores
```bash
# Terminal 1 - Backend API + WebSocket
cd backend
bun run dev

# Terminal 2 - Worker de Notificações
cd backend
bun run worker

# Terminal 3 - Frontend
cd frontend
npm run dev
```

## 🌐 Acessando o sistema

- Frontend: http://localhost:5173
- API: http://localhost:3000
- WebSocket: ws://localhost:3001

### Usuários de teste

| Email | Senha | Papel |
|-------|-------|-------|
| admin@oficina.com | password123 | Admin |
| mecanico@oficina.com | password123 | Mecânico |
| cliente@email.com | password123 | Cliente |

## 📱 Desenvolvimento Mobile
```bash
cd mobile
npm install

# Android
npm run android

# iOS
npm run ios
```

## 🧪 Testes
```bash
# Backend
cd backend
bun test

# Frontend
cd frontend
npm test
```

## 📦 Build para Produção

### Backend
```bash
cd backend
bun build src/index.ts --outdir dist
```

### Frontend
```bash
cd frontend
npm run build
```

## 🗂️ Estrutura do Projeto
```
oficina-manager/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Servidor principal
│   │   ├── worker.ts          # Worker de notificações
│   │   ├── routes/            # Rotas da API
│   │   ├── services/          # Serviços (auth, firebase, etc)
│   │   └── db/                # Migrations e conexão DB
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── mobile/
│   ├── src/
│   │   ├── screens/           # Telas do app
│   │   └── services/          # API e sync offline
│   └── package.json
└── docker-compose.yml
```

## 🔑 Funcionalidades Principais

- ✅ Autenticação JWT com refresh tokens
- ✅ CRUD completo de Ordens de Serviço
- ✅ WebSocket para atualizações em tempo real
- ✅ Upload de fotos/vídeos para Firebase Storage
- ✅ Notificações push via FCM
- ✅ Fallback automático: Push → SMS → Ligação
- ✅ Geração de PDF dos orçamentos
- ✅ Sincronização offline (mobile)
- ✅ Auditoria completa de ações
- ✅ Multi-tenancy

## 🛠️ Troubleshooting

### Postgres não conecta
```bash
docker-compose down
docker-compose up -d postgres
```

### WebSocket não conecta

Verifique se a porta 3001 está livre:
```bash
lsof -i :3001
```

### Upload não funciona

Verifique as regras do Firebase Storage:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{tenantId}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📄 Licença

MIT

## 👥 Suporte

Para dúvidas e suporte, abra uma issue no repositório.