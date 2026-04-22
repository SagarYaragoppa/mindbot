# MindBot 🤖

MindBot is a production-ready, full-stack AI assistant application featuring real-time streaming chat, Retrieval-Augmented Generation (RAG), autonomous agent task execution, voice input, and image analysis — all powered exclusively by the **Mistral Cloud API**.

The backend is deployed on **Render** and the frontend on **Vercel**, forming a fully serverless cloud architecture with no local model dependencies.

---

## ✨ Features

### Core AI
- **Real-time Streaming Chat** — Token-by-token streaming responses via `StreamingResponse` for a natural, low-latency experience
- **Mistral Cloud (Exclusive Model)** — All inference runs through `mistral-small-latest` via the Mistral Cloud API. No local models, no Ollama, no GPU required
- **Conversation Memory** — Server-side message history with a rolling 10-message context window per conversation
- **Intelligent Auto-Titling** — Conversation titles are auto-generated from the first message

### RAG (Document Q&A)
- **PDF Upload & Indexing** — Upload PDFs which are automatically chunked and indexed for semantic search
- **Source-Cited Responses** — Bot responses in RAG mode include cited source sections from your documents, highlighted in the UI
- **Keyword Highlighting** — Query keywords are visually highlighted within retrieved source passages

### Autonomous Agent
- **Agent Task Execution** — Executes multi-step tasks using LangChain's agent framework with DuckDuckGo web search as a tool
- **Image Analysis** — Upload images for vision-based Q&A (multimodal input support)

### Authentication & Security
- **JWT Authentication** — Secure token-based sessions with `python-jose`
- **Password Hashing** — `bcrypt` via `passlib`
- **Rate Limiting** — Per-endpoint rate limiting via `slowapi`
- **Role-based Access** — Admin and standard user roles; admin panel gated behind `is_admin` flag
- **Session Hardening** — Frontend global 401 interceptor forces logout on any expired/invalid token; stale localStorage state is auto-purged on every page load

### Frontend
- **Fully Responsive UI** — Mobile-first layout with breakpoints at 768px and 1024px
- **Overlay Sidebar** — Slide-in sidebar with hamburger toggle on mobile; always-visible on desktop
- **Dark / Light Theme** — Persisted across sessions via `localStorage`
- **Voice-to-Text** — Native Web Speech API with continuous recognition and visual pulse feedback
- **Admin Dashboard** — User management console with live telemetry (total users, conversations, messages)

---

## 🏗️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| [FastAPI](https://fastapi.tiangolo.com/) | High-performance async API framework |
| [SQLAlchemy](https://www.sqlalchemy.org/) + SQLite | ORM and relational database |
| [LangChain](https://python.langchain.com/) (`langchain-mistralai`) | LLM orchestration, streaming, agent execution |
| [Mistral AI](https://mistral.ai/) (`mistral-small-latest`) | Exclusive cloud LLM provider |
| [pypdf](https://pypi.org/project/pypdf/) | PDF parsing and text extraction |
| [python-jose](https://github.com/mpdavis/python-jose) | JWT token creation & verification |
| [passlib](https://passlib.readthedocs.io/) + bcrypt | Password hashing |
| [slowapi](https://github.com/laurents/slowapi) | Rate limiting |
| [python-multipart](https://github.com/andrew-d/python-multipart) | File upload handling |
| [python-dotenv](https://github.com/theskumar/python-dotenv) | Environment variable management |

### Frontend
| Technology | Purpose |
|---|---|
| [React](https://react.dev/) v19 | UI component library |
| [Vite](https://vitejs.dev/) v8 | Build tool and dev server |
| [Axios](https://axios-http.com/) | HTTP client with global 401 interceptor |
| [Lucide React](https://lucide.dev/) | Icon library |
| [React Markdown](https://github.com/remarkjs/react-markdown) + remark-gfm | Markdown rendering |
| [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) | Code block highlighting |
| Vanilla CSS | Responsive layout, glassmorphism, animations |

---

## 🚀 Deployment

### Production Architecture

```
User Browser
     │
     ├──► Vercel (Frontend — React/Vite)
     │         VITE_API_BASE_URL → Render backend URL
     │
     └──► Render (Backend — FastAPI + Docker)
               PORT: 10000
               MISTRAL_API_KEY → Mistral Cloud API
```

### Backend → Render

The backend is containerised with Docker and deployed on Render's free/starter tier.

**`backend/Dockerfile`** builds and starts the server:
```
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "10000"]
```

**Required environment variables on Render:**

| Variable | Description |
|---|---|
| `MISTRAL_API_KEY` | Your Mistral API key from [console.mistral.ai](https://console.mistral.ai/) |
| `SECRET_KEY` | Random string used for JWT signing (generate with `openssl rand -hex 32`) |
| `DATABASE_URL` | Optional — defaults to `sqlite:///./mindbot.db` |

**Steps:**
1. Push your repo to GitHub
2. On [render.com](https://render.com/) → **New Web Service** → connect your repo
3. Set **Root Directory** to `/` (repo root, not `/backend`)
4. Set **Dockerfile Path** to `backend/Dockerfile`
5. Add the environment variables above
6. Render will detect the `EXPOSE 10000` and route traffic accordingly

> **Note:** Render's free tier will spin down after inactivity. The frontend has a `/` health check endpoint that Render pings to keep the service warm.

### Frontend → Vercel

**`vercel.json`** at the repo root configures the deployment:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**Required environment variable on Vercel:**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Full URL of your Render backend, e.g. `https://mindbot.onrender.com` |

**Steps:**
1. On [vercel.com](https://vercel.com/) → **New Project** → import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add `VITE_API_BASE_URL` under **Environment Variables**
4. Deploy — Vercel auto-detects Vite and handles the rest

---

## 🛠️ Local Development

### Prerequisites
- **Node.js** v18+
- **Python** 3.10+
- A **Mistral API key** from [console.mistral.ai](https://console.mistral.ai/)

### 1. Clone the Repository

```bash
git clone <repository_url>
cd mindbot
```

### 2. Backend Setup

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file in the repo root
cp .env.example .env
# Add your MISTRAL_API_KEY and SECRET_KEY to .env

# Start the backend
uvicorn backend.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Health check: `GET /` → `{"status": "ok"}`.

### 3. Frontend Setup

Open a second terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create your local env file
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Start the Vite dev server
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. Create an Admin User

After starting the backend, run the admin setup script:

```bash
python setup_admin.py
```

---

## 🗂️ Project Structure

```
mindbot/
├── backend/
│   ├── core/
│   │   ├── security.py          # JWT helpers, rate limiter setup
│   │   └── text_utils.py        # Unicode safety, response sanitization
│   ├── models/
│   │   └── database.py          # SQLAlchemy models (User, Conversation, Message)
│   ├── routes/
│   │   ├── auth.py              # /auth/login, /auth/register, /auth/me
│   │   ├── chat.py              # /chat/stream, /conversations, /agent, /vision
│   │   ├── document.py          # /upload-doc, /list-docs, /delete-doc, /ask-rag
│   │   └── admin.py             # /admin/stats, /admin/users
│   ├── services/
│   │   ├── llm_service.py       # Mistral Cloud chat + streaming
│   │   ├── rag_service.py       # PDF chunking + semantic retrieval
│   │   ├── agent_service.py     # LangChain ReAct agent + DuckDuckGo tool
│   │   ├── auth_service.py      # Password hashing, JWT creation
│   │   ├── vision_service.py    # Image analysis via Mistral
│   │   └── audio_service.py     # Speech-to-text helpers
│   ├── Dockerfile               # Docker image for Render deployment
│   ├── main.py                  # FastAPI app entry, CORS, router registration
│   └── requirements.txt         # Backend Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── modes/
│   │   │   │   ├── GeneralChatView.jsx   # Standard streaming chat UI
│   │   │   │   ├── RagChatView.jsx       # Document Q&A with source citations
│   │   │   │   └── AgentChatView.jsx     # Autonomous agent task UI
│   │   │   ├── Sidebar.jsx              # Navigation, conversations, KB upload
│   │   │   ├── ChatWindow.jsx           # Central chat controller + API logic
│   │   │   ├── AuthView.jsx             # Login / register form
│   │   │   ├── AdminDashboard.jsx       # Admin stats + user management
│   │   │   └── SettingsModal.jsx        # Temperature config modal
│   │   ├── App.jsx                      # Root component, auth gate, interceptor
│   │   ├── index.css                    # Full vanilla CSS design system
│   │   └── main.jsx                     # React entry point
│   ├── vercel.json                      # Vercel deployment config
│   └── package.json
│
├── requirements.txt             # Root-level Python dependencies
├── docker-compose.yml           # Local full-stack Docker setup
├── setup_admin.py               # Script to create admin user
└── README.md
```

---

## 🔑 Environment Variables Reference

### Backend (`.env` in repo root)

```env
MISTRAL_API_KEY=your_mistral_api_key_here
SECRET_KEY=your_jwt_secret_key_here
DATABASE_URL=sqlite:///./mindbot.db   # optional, defaults to this
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

---

## 🐳 Docker (Full Stack Local)

```bash
# Build and start both services
docker-compose up --build

# Backend → http://localhost:8000
# Frontend → http://localhost:80
```

> Update `ALLOW_ORIGINS` in `docker-compose.yml` to match your frontend URL in production.

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/register` | No | Register new user |
| `POST` | `/auth/login` | No | Login, returns JWT |
| `GET` | `/auth/me` | JWT | Get current user info |
| `POST` | `/chat/stream` | JWT | Streaming chat response |
| `GET` | `/conversations` | JWT | List user conversations |
| `POST` | `/conversations` | JWT | Create new conversation |
| `GET` | `/conversations/{id}/messages` | JWT | Get conversation history |
| `DELETE` | `/conversations/{id}/messages` | JWT | Clear conversation |
| `POST` | `/upload-doc` | JWT | Upload & index a PDF |
| `GET` | `/list-docs` | JWT | List indexed documents |
| `DELETE` | `/delete-doc/{filename}` | JWT | Remove a document |
| `POST` | `/ask-rag` | JWT | Query indexed documents |
| `POST` | `/agent` | JWT | Run an autonomous agent task |
| `POST` | `/vision` | JWT | Analyse an uploaded image |
| `GET` | `/admin/stats` | JWT + Admin | Server-wide usage stats |
| `GET` | `/admin/users` | JWT + Admin | List all users |
| `DELETE` | `/admin/users/{id}` | JWT + Admin | Delete a user |

---

## 👥 Team & Contributions

Detailed roles and responsibilities are documented in [TEAM_ROLES.md](./TEAM_ROLES.md).

## Contributing

Contributions are welcome. Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.