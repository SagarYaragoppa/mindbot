"""
rag_service.py  –  EXTREMELY Lightweight Fallback (Cloud Optimized).

RAG is temporarily disabled to prevent memory crashes on resource-constrained 
deployments (e.g., Render 512MB). This file maintains the API signature 
to ensure the rest of the application remains functional.
"""

import os
from typing import List, Optional

# ---------------------------------------------------------------------------
# PUBLIC: Fallback Message
# ---------------------------------------------------------------------------
RAG_DISABLED_MESSAGE = "RAG is temporarily disabled in cloud deployment due to resource limits."

# ---------------------------------------------------------------------------
# PUBLIC: query_rag (FALLBACK)
# ---------------------------------------------------------------------------
def query_rag(
    query: str,
    conversation_id: Optional[int] = None,
    model: Optional[str] = None,
    provider: str = "mistral",
) -> str:
    """Returns a lightweight fallback message instead of performing RAG."""
    print(f"DEBUG: RAG request received (DISABLED MODE): '{query[:50]}'")
    return RAG_DISABLED_MESSAGE

# ---------------------------------------------------------------------------
# PUBLIC: load_document (STUB)
# ---------------------------------------------------------------------------
def load_document(file_path: str) -> list:
    print(f"DEBUG: load_document called for {file_path} (RAG DISABLED)")
    return []

# ---------------------------------------------------------------------------
# PUBLIC: split_docs (STUB)
# ---------------------------------------------------------------------------
def split_docs(docs: list) -> list:
    return []

# ---------------------------------------------------------------------------
# PUBLIC: create_vector_store (STUB)
# ---------------------------------------------------------------------------
def create_vector_store(chunks: list) -> None:
    print("DEBUG: create_vector_store called (RAG DISABLED)")
    pass

# ---------------------------------------------------------------------------
# PUBLIC: load_vector_store (STUB)
# ---------------------------------------------------------------------------
def load_vector_store() -> None:
    pass

# ---------------------------------------------------------------------------
# PUBLIC: index_document (STUB)
# ---------------------------------------------------------------------------
def index_document(file_path: str, model: Optional[str] = None, provider: str = "mistral"):
    print(f"DEBUG: index_document called for {file_path} (RAG DISABLED)")
    # Return a 0 chunk count and a fixed message to satisfy the route expectation
    return 0, "Document indexing is currently disabled in cloud mode."

# ---------------------------------------------------------------------------
# PUBLIC: summarize_document (STUB)
# ---------------------------------------------------------------------------
def summarize_document(chunks: list, model: Optional[str] = None, provider: str = "mistral") -> str:
    return "Summarization is currently disabled."

# ---------------------------------------------------------------------------
# PUBLIC: clear_index (STUB)
# ---------------------------------------------------------------------------
def clear_index() -> None:
    print("DEBUG: clear_index called (RAG DISABLED)")
    pass