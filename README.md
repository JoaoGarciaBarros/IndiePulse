# RageTrigger 💢

Sistema de telemetria para jogos. O jogador aperta um botão e o sistema captura automaticamente screenshot, logs do console, métricas de performance e envia tudo para o backend.

---

## Estrutura

```
IndiePulse/
├── rage-button/     → Frontend (React + Vite + TailwindCSS)
├── rage-backend/    → Backend  (Python + FastAPI + Supabase)
├── start.bat        → Inicia tudo com 1 clique (Windows)
└── start.ps1        → Alternativa PowerShell
```

---

## Início rápido (recomendado)

Dê **dois cliques** no arquivo `start.bat` na raiz do projeto.

Abre duas janelas automaticamente:
- **Frontend** → http://localhost:5173
- **Backend** → http://localhost:8000

> Precisa ter feito o setup abaixo pelo menos uma vez antes.

---

## Setup (primeira vez)

### Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- [Python 3.11+](https://python.org/)
- Conta no [Supabase](https://supabase.com/) com o schema criado

---

### 1. Frontend

```bash
cd rage-button
npm install
```

Cria o arquivo `.env` dentro de `rage-button/`:

```env
VITE_API_URL=http://localhost:8000
```

---

### 2. Backend

```bash
cd rage-backend

# Cria ambiente virtual
python -m venv .venv

# Ativa o ambiente (Windows)
.venv\Scripts\activate

# Instala dependências
pip install -r requirements.txt
```

Cria o arquivo `.env` dentro de `rage-backend/` (copia do exemplo):

```bash
copy .env.example .env
```

Edita o `.env` e coloca a URL do Supabase:

```env
DATABASE_URL=postgresql+asyncpg://postgres:SUA_SENHA@db.SEU_PROJETO.supabase.co:5432/postgres
```

> Encontra a URL em: **Supabase Dashboard → Connect → URI**

---

### 3. Banco de dados (Supabase)

Acessa o **SQL Editor** do Supabase e roda o conteúdo do arquivo `rage-backend/schema.sql`.

Isso cria todas as tabelas, índices e views necessárias.

---

## Rodando manualmente (sem o start.bat)

### Backend

```bash
cd rage-backend
.venv\Scripts\activate
python start.py
```

Disponível em:
- API → http://localhost:8000
- Docs interativos → http://localhost:8000/docs

---

### Frontend

```bash
cd rage-button
npm run dev
```

Disponível em http://localhost:5173

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/rage-trigger` | Recebe um report do frontend |
| `GET` | `/incidents` | Lista todos os incidents |
| `GET` | `/incidents/{id}` | Detalhes de um incident |
| `GET` | `/incidents/{id}/screenshot` | Imagem capturada |
| `GET` | `/incidents/{id}/video` | Replay dos 30s anteriores |
| `PATCH` | `/incidents/{id}` | Atualiza status ou severidade |
| `GET` | `/incidents/groups/list` | Bugs agrupados por similaridade |
| `GET` | `/health` | Status da API |
| `WS` | `/ws/frames/{session_id}` | Stream de frames para replay |

---

## Variáveis de ambiente

### Frontend (`rage-button/.env`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL do backend | `http://localhost:8000` |

### Backend (`rage-backend/.env`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL do banco (Supabase) | SQLite local |
| `REPLAY_ENABLED` | Ativa geração de replay | `true` |
| `REPLAY_MODE` | `websocket` ou `mss` | `websocket` |
| `PRIVACY_SCRUB_PII` | Remove emails/IPs dos logs | `true` |
| `DISCORD_WEBHOOK_URL` | Alertas no Discord | vazio |
| `SLACK_WEBHOOK_URL` | Alertas no Slack | vazio |
| `WEBHOOK_COOLDOWN_SECONDS` | Intervalo entre alertas | `60` |

---

## Alertas (Discord / Slack)

Adiciona a URL do webhook no `.env`:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

O sistema envia automaticamente quando um rage é reportado, com cooldown de 60 segundos por categoria para evitar spam.

---

## Replay pré-trigger

O sistema grava os **30 segundos anteriores** ao clique, não só o momento do evento.

**Modo `websocket`** (jogos browser):
O frontend envia frames via WebSocket. Adiciona no teu jogo:

```typescript
// Conecta ao backend e envia frames a cada 100ms
const ws = new WebSocket(`ws://localhost:8000/ws/frames/${sessionId}`)
setInterval(() => {
  const canvas = document.querySelector('canvas')
  if (canvas && ws.readyState === WebSocket.OPEN) {
    ws.send(canvas.toDataURL('image/jpeg', 0.5))
  }
}, 100)
```

**Modo `mss`** (jogo desktop na mesma máquina):
```env
REPLAY_MODE=mss
```
Captura a tela automaticamente sem precisar de nada no frontend.

---

## Migrar para produção

1. Troca `DATABASE_URL` para a URL de produção do Supabase
2. Define `APP_ENV=production` no `.env`
3. Troca `SECRET_KEY` por um valor seguro
4. Deploy do backend: Railway, Render, ou qualquer VPS com Python
5. Deploy do frontend: Vercel, Netlify, ou Cloudflare Pages
