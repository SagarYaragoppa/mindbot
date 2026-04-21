"""
rag_service.py  –  EXTREMELY Lightweight RAG (Memory optimized for 512MB RAM).

Replaces all ML-based embeddings (FAISS, HuggingFace, scikit-learn) with a 
simple, pure-python keyword overlap search. This eliminates dependency on 
heavy ML libraries and keeps the backend footprint < 100MB.

All public functions (load_document, split_docs, create_vector_store,
load_vector_store, index_document, query_rag, clear_index,
summarize_document) have IDENTICAL signatures to the original.
"""

import os
import shutil
import json
import pickle
from typing import List, Optional

from backend.services.llm_service import generate_chat_response
from backend.core.text_utils import sanitize_text, safe_response

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DB_PATH = "backend/data/faiss_index"          # kept for API / path compat
_INDEX_FILE = os.path.join(DB_PATH, "simple_index.pkl")

# ---------------------------------------------------------------------------
# In-memory store (populated lazily on first use)
# ---------------------------------------------------------------------------
# _chunks : list[dict]  – each has {"page_content": str, "metadata": dict}
_chunks: List[dict] = []
_store_ready: bool = False


# ---------------------------------------------------------------------------
# INTERNAL: similarity search – returns top-k chunk dicts using keyword overlap
# ---------------------------------------------------------------------------
def _similarity_search(query: str, k: int = 2) -> List[dict]:
    """Pure-python keyword overlap search (Zero ML dependencies)."""
    if not _chunks:
        return []
        
    try:
        # Pre-process query tokens
        query_tokens = set(query.lower().split())
        if not query_tokens:
            return []

        scored_chunks = []
        for chunk in _chunks:
            content = chunk.get("page_content", "").lower()
            # Simple score: count how many query words appear in the chunk
            overlap = 0
            for token in query_tokens:
                if token in content:
                    overlap += 1
            
            if overlap > 0:
                scored_chunks.append((overlap, chunk))

        # Sort by score (overlap count) descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        # Return top-k
        return [item[1] for item in scored_chunks[:k]]
    except Exception as e:
        print(f"DEBUG: similarity_search error: {sanitize_text(str(e))}")
        return []


# ---------------------------------------------------------------------------
# PUBLIC: load_document
# ---------------------------------------------------------------------------
def load_document(file_path: str) -> list:
    """Lazy imports LangChain loaders only when needed."""
    if file_path.endswith(".pdf"):
        from langchain_community.document_loaders import PyPDFLoader
        loader = PyPDFLoader(file_path)
    else:
        from langchain_community.document_loaders import TextLoader
        loader = TextLoader(file_path)
    
    docs = loader.load()
    print(f"Loaded docs: {len(docs)}")
    return docs


# ---------------------------------------------------------------------------
# PUBLIC: split_docs
# ---------------------------------------------------------------------------
def split_docs(docs: list) -> list:
    """Lazy imports LangChain splitters only when needed."""
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(docs)
    print(f"Chunks: {len(chunks)}")
    return chunks


# ---------------------------------------------------------------------------
# PUBLIC: create_vector_store (Stores chunks and marks ready)
# ---------------------------------------------------------------------------
def create_vector_store(chunks: list) -> None:
    global _chunks, _store_ready
    if not chunks:
        raise ValueError("No chunks to store!")

    # Convert LangChain Document objects to plain dicts for pickling
    _chunks = [
        {
            "page_content": c.page_content,
            "metadata": dict(c.metadata) if hasattr(c, "metadata") else {}
        }
        for c in chunks
    ]

    _store_ready = True

    # Persist to disk so it survives restarts
    os.makedirs(DB_PATH, exist_ok=True)
    with open(_INDEX_FILE, "wb") as f:
        pickle.dump(_chunks, f)

    print("Stored lightweight index")


# ---------------------------------------------------------------------------
# PUBLIC: load_vector_store (Lazy-loads from disk on first RAG query)
# ---------------------------------------------------------------------------
def load_vector_store() -> None:
    global _chunks, _store_ready
    try:
        if os.path.exists(_INDEX_FILE):
            with open(_INDEX_FILE, "rb") as f:
                _chunks = pickle.load(f)
            _store_ready = True
            print("DEBUG: Lightweight index loaded from disk")
        else:
            _chunks = []
            _store_ready = False
            print("DEBUG: No saved index found")
    except Exception as e:
        print(f"DEBUG: Error loading index: {sanitize_text(str(e))}")
        _chunks = []
        _store_ready = False


# ---------------------------------------------------------------------------
# PUBLIC: summarize_document
# ---------------------------------------------------------------------------
def summarize_document(chunks: list, model: Optional[str] = None, provider: str = "mistral") -> str:
    """Generates a concise summary from the first few chunks of a document."""
    if not chunks:
        return "No content available to summarize."

    # Handle both Document objects and dicts
    sample_texts = []
    for c in chunks[:5]:
        if hasattr(c, "page_content"):
            sample_texts.append(c.page_content)
        elif isinstance(c, dict):
            sample_texts.append(c.get("page_content", ""))

    summary_context = "\n".join(sample_texts)

    prompt = (
        "Please provide a concise summary of the following document content. "
        "Use 5-8 bullet points or a short paragraph. "
        "Make it easy to understand for a general user.\n\n"
        f"CONTENT:\n{summary_context}"
    )

    try:
        summary = generate_chat_response(prompt, model=model, provider=provider)
        return summary
    except Exception as e:
        print(f"DEBUG: Summary generation failed: {sanitize_text(str(e))}")
        return "Summary generation failed."


# ---------------------------------------------------------------------------
# PUBLIC: index_document
# ---------------------------------------------------------------------------
def index_document(file_path: str, model: Optional[str] = None, provider: str = "mistral"):
    docs = load_document(file_path)
    if not docs:
        raise ValueError("Document loading failed!")

    chunks = split_docs(docs)
    if not chunks:
        raise ValueError("Chunking failed!")

    create_vector_store(chunks)

    summary = summarize_document(chunks, model=model, provider=provider)
    return len(chunks), summary


# ---------------------------------------------------------------------------
# PUBLIC: query_rag
# ---------------------------------------------------------------------------
def query_rag(
    query: str,
    conversation_id: Optional[int] = None,
    model: Optional[str] = None,
    provider: str = "mistral",
) -> str:
    safe_query_preview = sanitize_text(query[:50])
    print(f"DEBUG: RAG request received: '{safe_query_preview}...'")

    actual_query = sanitize_text(query.strip(), remove_emojis=True)

    # Lazy-load index if in-memory store is empty
    if not _store_ready:
        load_vector_store()

    docs = _similarity_search(actual_query, k=2)
    print(f"DEBUG: Documents matched: {len(docs)}")

    # Build prompt
    sections = []

    system_instructions = (
        "Instructions:\n"
        "- Answer the following question based ONLY on the provided context.\n"
        "- Be clear, concise, and professional.\n"
        "- Use bullet points for lists or steps where appropriate.\n"
        "- If the information is not present in the context, say 'Not found in document'.\n"
        "- Do not repeat or reference previous answers."
    )
    sections.append(system_instructions)

    if docs:
        raw_context = "\n---\n".join([d["page_content"].strip() for d in docs])
        context = raw_context[:1500]
        sections.append(f"Context:\n{context}")

    sections.append(f"Question:\n{actual_query}")
    final_prompt = "\n\n".join(sections)

    answer = generate_chat_response(
        final_prompt, model=model, provider=provider, conversation_id=conversation_id
    )

    clean_answer = safe_response(answer) if answer else "Something went wrong. Please try again."

    # Append source citations
    if docs:
        source_text = "\n\n### Sources\n"
        for i, doc in enumerate(docs):
            source_path = doc["metadata"].get("source", "Unknown Document")
            source_name = os.path.basename(str(source_path))
            page = doc["metadata"].get("page")
            page_info = f" (Page {page + 1})" if page is not None else ""
            chunk = doc["page_content"].replace("\n", " ").strip()
            truncated_chunk = chunk[:150] + "..." if len(chunk) > 150 else chunk
            source_text += f'{i+1}. **{source_name}{page_info}**: "{truncated_chunk}"\n'

        return f"{clean_answer}{source_text}"

    return clean_answer


# ---------------------------------------------------------------------------
# PUBLIC: clear_index
# ---------------------------------------------------------------------------
def clear_index() -> None:
    global _chunks, _store_ready
    _chunks = []
    _store_ready = False

    if os.path.exists(DB_PATH):
        try:
            shutil.rmtree(DB_PATH)
            print("Index files cleared")
        except Exception as e:
            print(f"DEBUG: clear_index error: {str(e)}")