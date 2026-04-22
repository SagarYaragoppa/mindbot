import os
import shutil
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


from backend.services.llm_service import generate_chat_response
from backend.core.text_utils import sanitize_text, safe_response

# Path to store FAISS index
DB_PATH = "backend/data/faiss_index"

embeddings = None

def get_embeddings():
    global embeddings
    if embeddings is not None:
        return embeddings
    try:
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            from dotenv import load_dotenv
            load_dotenv()
            api_key = os.getenv("MISTRAL_API_KEY")

        if api_key:
            from langchain_mistralai import MistralAIEmbeddings
            embeddings = MistralAIEmbeddings(mistral_api_key=api_key)
        else:
            print("WARNING: MISTRAL_API_KEY not found.")
            embeddings = None
    except Exception as e:
        print(f"WARNING: Failed to load Mistral embeddings - {e}")
        embeddings = None
    return embeddings
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
        chunk_size=250, # Reduced to save memory
        chunk_overlap=30
    )

    chunks = splitter.split_documents(docs)

    print("Chunks:", len(chunks))

    return chunks


# -------------------------------
# CREATE / UPDATE VECTOR STORE
# -------------------------------
def create_vector_store(chunks):
    global vector_store
    if not chunks:
        raise ValueError("No chunks to store!")
    _embeddings = get_embeddings()
    if _embeddings:
        from langchain_community.vectorstores import FAISS
        vector_store = FAISS.from_documents(chunks, _embeddings)
        vector_store.save_local(DB_PATH)
        print("Stored in FAISS")
    else:
        print("Embeddings failed to load, cannot create FAISS store")


# -------------------------------
# LOAD VECTOR STORE
# -------------------------------
def load_vector_store():
    global vector_store
    _embeddings = get_embeddings()
    if not _embeddings:
        return
    try:
        from langchain_community.vectorstores import FAISS
        if os.path.exists(DB_PATH):
            vector_store = FAISS.load_local(
                DB_PATH,
                _embeddings,
                allow_dangerous_deserialization=True
            )
            print("DEBUG: FAISS index loaded successfully")
        else:
            vector_store = None
    except Exception as e:
        safe_error = sanitize_text(str(e))
        print(f"DEBUG: Error loading FAISS index: {safe_error}")
        vector_store = None


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

    create_vector_store(chunks)
    
    # Generate summary
    summary = summarize_document(chunks, model=model, provider=provider)

    return len(chunks), summary


# -------------------------------
# QUERY RAG
# -------------------------------
def query_rag(query: str, conversation_id: int = None, model: str = None, provider: str = "mistral"):
    safe_query_preview = sanitize_text(query[:50])
    print(f"DEBUG: RAG request received: '{safe_query_preview}...'")
    global vector_store

    actual_query = sanitize_text(query.strip(), remove_emojis=True)

    if vector_store is None:
        load_vector_store()

    docs = []
    if vector_store is not None:
        try:
            if not hasattr(vector_store, 'index') or vector_store.index.ntotal > 0:
                print(f"DEBUG: Searching vector store.")
                # Requirement 3: Use top 3 results
                docs = vector_store.similarity_search(actual_query, k=3)
                print(f"DEBUG: Documents retrieved: {len(docs)}")
        except Exception as e:
            safe_error = sanitize_text(str(e))
            print(f"DEBUG: similarity_search error: {safe_error}")

    # Requirement 2: Clean context before passing to model
    cleaned_chunks = []
    for doc in docs:
        # Replace newlines with spaces and trim
        content = doc.page_content.replace("\n", " ").strip()
        # Limit to ~400 chars
        cleaned_chunks.append(content[:400])
    
    context = "\n\n".join(cleaned_chunks) if cleaned_chunks else ""

    # Requirement 1: Update RAG prompt
    prompt = f"""You are an AI assistant.

Answer the user's question using ONLY the provided document context.

Rules:

* Provide a clear and well-structured answer
* Use bullet points when listing items
* Keep the answer concise and easy to read
* If the document contains lists (like applications, advantages, etc.), present them properly
* Do NOT include raw chunks, file names, or "Sources"
* Do NOT include escape characters like \\n

If the answer is not clearly present, say:
"The document does not contain a clear answer."

Context:
{context}

Question:
{actual_query}

Answer:"""

    response = generate_chat_response(prompt, model=model, provider=provider, conversation_id=conversation_id)
    
    if not response:
        return "Something went wrong. Please try again."

    # Requirement 4: Clean final response
    response = response.replace("\\n", "\n") # Handle escape characters
    response = response.replace("###", "")   # Remove formatting artifacts
    response = response.strip()

    # Fallback check
    if not response or "not found in document" in response.lower() or "not clearly present" in response.lower():
         response = "The document does not contain a clear answer."

    return response


# -------------------------------
# CLEAR INDEX
# -------------------------------
def clear_index():
    global vector_store
    vector_store = None
    if os.path.exists(DB_PATH):
        shutil.rmtree(DB_PATH)
        print("FAISS index cleared")