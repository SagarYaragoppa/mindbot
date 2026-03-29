# MindBot

MindBot is a full-stack, intelligent AI assistant application that provides real-time chat, context-aware memory, and Retrieval-Augmented Generation (RAG) capabilities. The platform allows users to chat with an AI, maintain conversation histories with auto-generated titles, and query specific knowledge extracted from uploaded PDFs and web URLs.

## Features

- **Interactive AI Chat**: Real-time streaming chat responses powered by Ollama (Llama 3.1 model).
- **Contextual Memory**: Dynamically summarises chat history to maintain the conversation context window effectively over long sessions.
- **RAG Engine (Retrieval-Augmented Generation)**:
  - Upload and parse PDF documents.
  - Ingest content from web URLs.
  - Ask targeted questions against your uploaded, indexed documents (powered by Faiss).
- **User Authentication & Authorization**: Secure JWT-based user, session, and conversation management. Role-based access (admin vs regular users).
- **Auto-Titling**: Automatically generates a concise title for new conversations based on the user's first prompt.

## Tech Stack

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) - High-performance backend API framework.
- [SQLAlchemy](https://www.sqlalchemy.org/) - SQL ORM for database interactions.
- [SQLite](https://www.sqlite.org/) - Lightweight local relational database.
- [LangChain](https://python.langchain.com/) - LLM orchestration and logic.
- [Faiss (CPU)](https://faiss.ai/) - Vector storage and similarity search for RAG.
- [Ollama](https://ollama.com/) - Run Large Language Models locally (Llama 3.1).

**Frontend:**
- [React](https://react.dev/) (v19) - UI Component Library.
- [Vite](https://vitejs.dev/) - Blazing fast build tool.
- [Lucide React](https://lucide.dev/) - Beautiful, consistent icons.
- [React Markdown](https://github.com/remarkjs/react-markdown) - For parsing and rendering rich-text bot responses.

## Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js** (v18+)
- **Python** (3.8+)
- **Ollama**: Download and install from [ollama.com](https://ollama.com/). Pull the required Llama 3.1 model:
  ```bash
  ollama run llama3.1
  ```

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository_url>
cd mindbot
```

### 2. Backend Setup

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install backend dependencies
cd ..
pip install -r requirements.txt

# Start the Fast API backend server
cd backend
uvicorn main:app --reload
```
The backend API will run at `http://localhost:8000`. *(Note: Ensure you have your `.env` configured inside `backend/` if needed, based on `.env.example`.)*

### 3. Frontend Setup

Open a new terminal window.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend will run at `http://localhost:5173`. Open this URL in your browser to interact with MindBot.

## Project Structure

```text
mindbot/
├── backend/                  # FastAPI application code
│   ├── core/                 # Security and rate limiting config
│   ├── models/               # SQLAlchemy DB models (SQLite)
│   ├── routes/               # API endpoints (Auth, Chat, Document, Admin)
│   ├── services/             # Core business logic (LLM, RAG, Auth)
│   └── main.py               # FastAPI application entry point
├── frontend/                 # React frontend client
│   ├── public/               # Static assets
│   ├── src/                  # React components and views
│   ├── index.html            # Main HTML file
│   └── package.json          # Node dependencies and scripts
├── data/                     # Data storage location for indexed PDFs/files
├── requirements.txt          # Python dependencies
└── README.md                 # This documentation file
```

## 👥 Team & Contributions
Detailed roles and responsibilities are documented in [TEAM_ROLES.md](./TEAM_ROLES.md).

## Contributing
Contributions are welcome. Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.