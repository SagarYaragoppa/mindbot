import os
import shutil
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from backend.services.llm_service import generate_chat_response
from backend.core.text_utils import sanitize_text, safe_response


# Path to store FAISS index
DB_PATH = "backend/data/faiss_index"

# Embeddings model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

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
    global vector_store

    if not chunks:
        raise ValueError("No chunks to store!")

    vector_store = FAISS.from_documents(chunks, embeddings)

    vector_store.save_local(DB_PATH)

    print("Stored in FAISS")


# -------------------------------
# LOAD VECTOR STORE
# -------------------------------
def load_vector_store():
    global vector_store

    try:
        if os.path.exists(DB_PATH):
            vector_store = FAISS.load_local(
                DB_PATH,
                embeddings,
                allow_dangerous_deserialization=True
            )
            print("DEBUG: FAISS index loaded successfully")
        else:
            vector_store = None
            print("DEBUG: FAISS index path does not exist")
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

    # Clean the incoming query (backend manages history via conversation_id)
    actual_query = sanitize_text(query.strip(), remove_emojis=True)

    # Lazy-load vector store if needed
    if vector_store is None:
        load_vector_store()

    docs = []
    if vector_store is not None:
        try:
            if not hasattr(vector_store, 'index') or vector_store.index.ntotal > 0:
                print(f"DEBUG: Searching vector store. Index size: {getattr(vector_store.index, 'ntotal', 'unknown')}")
                # Limit to 2 chunks to keep context tight and avoid token explosion
                docs = vector_store.similarity_search(actual_query, k=2)
                print(f"DEBUG: Documents retrieved: {len(docs)}")
        except Exception as e:
            safe_error = sanitize_text(str(e))
            print(f"DEBUG: similarity_search error: {safe_error}")

    # ------------------------------------------------------------------
    # Build clean, structured RAG prompt:
    # Instructions -> Context (doc chunks only) -> Question
    # Previous assistant output is NEVER included in the context section.
    # ------------------------------------------------------------------
    sections = []

    # Core instructions
    system_instructions = (
        "Instructions:\n"
        "- Answer the following question based ONLY on the provided context.\n"
        "- Be clear, concise, and professional.\n"
        "- Use bullet points for lists or steps where appropriate.\n"
        "- If the information is not present in the context, say 'Not found in document'.\n"
        "- Do not repeat or reference previous answers."
    )
    sections.append(system_instructions)

    # Context section: document chunks only (no history, no previous answers)
    if docs:
        raw_context = "\n---\n".join([doc.page_content.strip() for doc in docs])
        # Hard cap at 1500 chars to prevent token bloat
        context = raw_context[:1500]
        sections.append(f"Context:\n{context}")

    # Question section
    sections.append(f"Question:\n{actual_query}")

    final_prompt = "\n\n".join(sections)

    # Generate response (conversation_id lets the LLM service handle turn memory)
    answer = generate_chat_response(final_prompt, model=model, provider=provider, conversation_id=conversation_id)

    # Apply backend garbage filter
    clean_answer = safe_response(answer) if answer else "Something went wrong. Please try again."

    # Append source citations if RAG was used
    if docs:
        source_text = "\n\n### Sources\n"
        for i, doc in enumerate(docs):
            source_path = doc.metadata.get("source", "Unknown Document")
            source_name = os.path.basename(source_path)
            page = doc.metadata.get("page")
            page_info = f" (Page {page + 1})" if page is not None else ""
            chunk = doc.page_content.replace("\n", " ").strip()
            truncated_chunk = chunk[:150] + "..." if len(chunk) > 150 else chunk
            source_text += f"{i+1}. **{source_name}{page_info}**: \"{truncated_chunk}\"\n"

        return f"{clean_answer}{source_text}"

    return clean_answer


# -------------------------------
# CLEAR INDEX
# -------------------------------
def clear_index():
    global vector_store
    vector_store = None
    if os.path.exists(DB_PATH):
        shutil.rmtree(DB_PATH)
        print("FAISS index cleared")