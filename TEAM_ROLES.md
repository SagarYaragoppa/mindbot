# MindBot Team Structure & Work Division

## 👑 Team Leader

### 0. Sagar Ramesh Yaragoppa - Team Leader

**Focus:** Overall project direction, coordination, and decision-making.

**Responsibilities:** Ensure smooth communication between all teams, track progress, and make high-level technical and strategic decisions.

**What they manage:**
- Project planning, deadlines, and task distribution.
- Coordination between Backend, Frontend, AI, and DevOps teams.
- Reviewing architecture decisions and ensuring scalability of the system.
- Final integration and presentation of the project.

## 🏗️ Backend Team (3 developers)

### 1. Rugved Narendra Bhandarkar - Backend Core & Database Architect
**Focus:** Infrastructure, API structure, and Database modeling.
* **Responsibilities:** Set up the base FastAPI application, connect it to the SQLite database via SQLAlchemy, and manage routing.
* **What they build:**
  * `backend/main.py`: Setup CORS, error handlers, and generic middleware.
  * `backend/models/database.py`: Define the DB models (`User`, `Conversation`, `ChatMessage`).
  * `backend/core/security.py`: Implement rate-limiting and baseline application security.

### 2. Kavya PatelSecurity & Authentication Engineer
**Focus:** User management, login sessions, and admin capabilities.
* **Responsibilities:** Ensure that only verified users can access the application and restrict sensitive features to administrators.
* **What they build:**
  * `backend/routes/auth.py`: Endpoints for register, login, and `/me`.
  * `backend/services/auth_service.py`: Password hashing, JWT token creation, and validation.
  * `backend/routes/admin.py`: Endpoints for managing users and viewing platform statistics.

### 3. Shreya Diliprao Thakare - AI & Chat Integration Engineer
**Focus:** Core conversational magic and response generation.
* **Responsibilities:** Manage the integration with the local LLM (Ollama) and ensure conversational context is maintained cleanly.
* **What they build:**
  * `backend/services/llm_service.py`: Streaming chunks from the Llama 3.1 model back to the user.
  * Memory Management: The dynamic context window and auto-summarization logic when a chat gets too long.
  * Auto-Titling Engine: Generating short, punchy titles based on user prompts.
  * `backend/routes/chat.py`: Managing conversation endpoints.

---

## 🧠 Data & Search Team (1 developer)

### 4. Sagar Ramesh Yaragoppa - RAG / Data Engineer
**Focus:** Document processing, vector databases, and retrieval.
* **Responsibilities:** Ingest knowledge so the bot can answer contextual questions outside its training data.
* **What they build:**
  * `backend/routes/document.py`: Endpoints for document uploads, URL scraping, and deletion.
  * `backend/services/rag_service.py`: PDF text extraction (PyPDF), URL parsing, text-chunking (Langchain), and embedding creation.
  * Search Engine: Managing the **Faiss-CPU** index to fetch relevant document chunks and feed them into the LLM context.

---

## 🎨 Frontend Team (3 developers)

### 5. Yash Sudam Ukirde - Frontend Lead & State Manager
**Focus:** Web app foundation, routing, and global state tracking.
* **Responsibilities:** Keep the React application organized, manage global user sessions, and connect to the backend APIs.
* **What they build:**
  * Base Vite setup, ESLint, and global CSS structure.
  * React Router setup (e.g., protected routes for logged-in users vs public auth pages).
  * Global state management (Context API or Zustand) to track the active User, active Conversation ID, and loading states.
  * `src/App.jsx` and general Navigation (Sidebar/Header).

### 6. Lathisha Padayachi - Chat UI/UX Engineer
**Focus:** The main chat window and user interactions.
* **Responsibilities:** Build a beautiful, responsive, and dynamic chat interface that feels high-quality and premium.
* **What they build:**
  * The actual text bubbles for the AI vs User.
  * Integration of **React Markdown** and syntax-highlighters for clear code rendering.
  * Reading the streaming chunk responses from the backend (handling Server-Sent Events or async generators) and displaying typewriter effects.
  * Auto-scrolling, copying text, and input expanding behaviors.

### 7. Sahil Kadaskar - Document & Settings UI Developer
**Focus:** The interface for the RAG features and User Settings/Admin components.
* **Responsibilities:** Provide the user with tools to upload their knowledge base, as well as an admin portal.
* **What they build:**
  * Drag-and-drop PDF upload UI, URL input fields, and loading spinners displaying indexing progress.
  * A table or list view of currently indexed documents with delete buttons.
  * Admin dashboard views (viewing all active users, deleting chats).
  * The Login and Registration split forms.

---

## ⚙️ Quality Assurance & DevOps (1 developer)

### 8.Khushal Moundekar - QA, Testing, & DevOps Engineer
**Focus:** Stability, deployment, testing, and developer experience.
* **Responsibilities:** Ensure that what the team builds works perfectly together and can be deployed easily.
* **What they build:**
  * Automated workflows / Unit tests (PyTest for backend, Vitest/Jest for frontend).
  * Dockerization: Writing `Dockerfile`s and a `docker-compose.yml` to spin up the Backend, Frontend, and Ollama instance together in one command.
  * Prompt Tuning & Edge Cases: Purposefully trying to break the LLM (testing out-of-context RAG queries, spamming APIs) and fixing them.
  * Cross-browser compatibility checks and responsive mobile-view CSS adjustments.

---


