# MindBot

MindBot is a production-ready, full-stack intelligent AI assistant application that provides real-time chat, context-aware memory, and optimized Retrieval-Augmented Generation (RAG) capabilities. Optimized for cloud deployment (Render/Vercel), MindBot delivers a premium, responsive experience across all devices.

## Features

- **Cloud-Powered AI Chat**: Real-time streaming chat responses powered by **Mistral Cloud** for high performance and reliability.
- **Mobile-First Responsive UI**: A premium interface built with Vanilla CSS and Tailwind utilities, fully optimized for mobile, tablet, and desktop.
- **Advanced RAG Engine (Retrieval-Augmented Generation)**:
  - Optimized PDF parsing and chunking for low-memory environments.
  - Web URL ingestion for real-time knowledge retrieval.
  - **Source Transparency**: Context-aware citations and source highlighting in AI responses.
- **Rigorous Response Sanitization**: Built-in logic to clean AI outputs, removing escape characters, artifacts, and ensuring safe rendering.
- **Voice-to-Text Integration**: Native browser Speech Recognition (Web Speech API) with dynamic visual pulse feedback.
- **Premium Design System**: High-fidelity Glassmorphism, smooth micro-animations, and a sleek dark/light theme.
- **Secure Authentication**: Gate-based JWT session management and conversation security.
- **Intelligent Auto-Titling**: Contextual conversation titles generated on-the-fly.

## Tech Stack

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) - High-performance API framework.
- [Mistral AI API](https://mistral.ai/) - Cloud LLM integration via `langchain-mistralai`.
- [SQLAlchemy](https://www.sqlalchemy.org/) - SQL ORM for SQLite database interactions.
- [LangChain](https://python.langchain.com/) - LLM orchestration and logic.
- [Faiss (CPU)](https://faiss.ai/) - Lightweight vector storage for RAG.

**Frontend:**
- [React](https://react.dev/) (v19) - Modern UI Library.
- [Vite](https://vitejs.dev/) - Blazing fast build tool.
- [Vanilla CSS & Tailwind](https://tailwindcss.com/) - Custom, high-performance styling system.
- [Lucide React](https://lucide.dev/) - Premium iconography.

## Prerequisites

Before starting, ensure you have:
- **Node.js** (v18+)
- **Python** (3.8+)
- **Mistral API Key**: Obtain one from the [Mistral Console](https://console.mistral.ai/).

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository_url>
cd mindbot
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
GROQ_API_KEY=your_groq_api_key_here (optional)
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r ../requirements.txt
uvicorn main:app --reload
```
The backend API will run at `http://localhost:8000`.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
The frontend will run at `http://localhost:5173`.

## Production Deployment

MindBot is pre-configured for modern cloud platforms:
- **Frontend**: Deploy to [Vercel](https://vercel.com/) (React/Vite).
- **Backend**: Deploy to [Render](https://render.com/) (FastAPI).
- **Database**: Uses SQLite for local/small scale; can be migrated to PostgreSQL for production scaling.

## Project Structure

```text
mindbot/
├── backend/                  # FastAPI application code
│   ├── core/                 # Security, sanitization, and lazy-loading
│   ├── models/               # SQLAlchemy DB models
│   ├── routes/               # API endpoints (Auth, Chat, Document)
│   ├── services/             # Cloud LLM & optimized RAG logic
│   └── main.py               # Application entry point
├── frontend/                 # React frontend client
│   ├── src/                  # Components, Hooks, and Views
│   └── index.css             # Core design system
├── data/                     # Vector store index storage
├── requirements.txt          # Python dependencies
└── README.md                 # This documentation
```


## 👥 Team & Contributions
Detailed roles and responsibilities are documented in [TEAM_ROLES.md](./TEAM_ROLES.md).

## License
This project is licensed under the MIT License.