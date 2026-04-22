import os
import shutil
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.services.llm_service import generate_chat_response
from backend.core.text_utils import sanitize_text, safe_response


# Path to store FAISS index
DB_PATH = "backend/data/faiss_index"

# Embeddings removed for cloud deployment
embeddings = None
vector_store = None


# -------------------------------
# LOAD DOCUMENT
# -------------------------------
def load_document(file_path):
    if file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path)

    docs = loader.load()

    print("Loaded docs:", len(docs))

    return docs


# -------------------------------
# SPLIT DOCUMENT
# -------------------------------
def split_docs(docs):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = splitter.split_documents(docs)

    print("Chunks:", len(chunks))

    return chunks


# -------------------------------
# CREATE / UPDATE VECTOR STORE
# -------------------------------
def create_vector_store(chunks):
    # RAG disabled in cloud mode
    print("Stored in mock FAISS (RAG disabled)")


# -------------------------------
# LOAD VECTOR STORE
# -------------------------------
def load_vector_store():
    # RAG disabled in cloud mode
    pass


# -------------------------------
# SUMMARIZE DOCUMENT
# -------------------------------
def summarize_document(chunks, model=None, provider="mistral"):
    """
    Generates a concise summary from the first few chunks of a document.
    """
    if not chunks:
        return "No content available to summarize."
    
    # Take first 5 chunks for summary context (approx 2500 tokens)
    summary_context = "\n".join([c.page_content for c in chunks[:5]])
    
    prompt = f"""
    Please provide a concise summary of the following document content. 
    Use 5-8 bullet points or a short paragraph. 
    Make it easy to understand for a general user.

    CONTENT:
    {summary_context}
    """
    
    try:
        summary = generate_chat_response(prompt, model=model, provider=provider)
        return summary
    except Exception as e:
        safe_error = sanitize_text(str(e))
        print(f"DEBUG: Summary generation failed: {safe_error}")
        return "Summary generation failed."


# -------------------------------
# MAIN INDEX FUNCTION
# -------------------------------
def index_document(file_path, model=None, provider="mistral"):
    docs = load_document(file_path)

    if not docs:
        raise ValueError("Document loading failed!")

    chunks = split_docs(docs)

    if not chunks:
        raise ValueError("Chunking failed!")

    # create_vector_store(chunks) # Disabled for cloud
    
    # Generate summary
    summary = summarize_document(chunks, model=model, provider=provider)

    return len(chunks), summary


# -------------------------------
# QUERY RAG
# -------------------------------
def query_rag(query: str, conversation_id: int = None, model: str = None, provider: str = "mistral"):
    return "RAG is temporarily disabled in cloud deployment due to resource limits."


# -------------------------------
# CLEAR INDEX
# -------------------------------
def clear_index():
    global vector_store
    vector_store = None
    print("Mock FAISS index cleared")