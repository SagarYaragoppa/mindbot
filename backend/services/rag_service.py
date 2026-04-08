import os
import shutil
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

from backend.services.llm_service import generate_chat_response

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
        print(f"DEBUG: Error loading FAISS index: {e}")
        vector_store = None


# -------------------------------
# MAIN INDEX FUNCTION
# -------------------------------
def index_document(file_path):
    docs = load_document(file_path)

    if not docs:
        raise ValueError("Document loading failed!")

    chunks = split_docs(docs)

    if not chunks:
        raise ValueError("Chunking failed!")

    create_vector_store(chunks)

    return len(chunks)


# -------------------------------
# QUERY RAG
# -------------------------------
def query_rag(query: str):
    print(f"DEBUG: RAG request received: '{query[:50]}...'")
    global vector_store

    # 1. Strict null check
    if vector_store is None:
        load_vector_store()

    if vector_store is None:
        print("DEBUG: Vector store is None (KB empty).")
        return "Knowledge base is empty. Please upload documents."

    # 2. Prevent blocking call - check if index has data
    try:
        # Check ntotal for FAISS
        if hasattr(vector_store, 'index') and vector_store.index.ntotal == 0:
            print("DEBUG: FAISS index exists but is empty.")
            return "Knowledge base is empty. Please upload documents."

        print(f"DEBUG: Vector store loaded. Index size: {vector_store.index.ntotal}")

        # 3. Timeout safety / Error handling
        docs = vector_store.similarity_search(query, k=2)
        print(f"DEBUG: Documents retrieved: {len(docs)}")

    except Exception as e:
        print(f"DEBUG: similarity_search error: {str(e)}")
        # Fallback to normal LLM
        return generate_chat_response(query)

    # 4. Fallback if no documents found
    if not docs:
        print("DEBUG: No relevant docs. Falling back to normal chat.")
        return generate_chat_response(query)

    context = "\n".join([doc.page_content for doc in docs])
    context = context[:1500]

    prompt = f"""
Answer the question briefly using the context details below. 
If the context is irrelevant, answer based on your general knowledge.

Context:
{context}

Question: {query}
"""

    answer = generate_chat_response(prompt)
    
    # Safely extract chunks for source display
    source_text = "\n\n---\nSources:"
    for i, doc in enumerate(docs[:2]):
        chunk = doc.page_content.replace("\n", " ").strip()
        source_text += f"\n- {chunk[:150]}..."
        
    return f"{answer}{source_text}"


# -------------------------------
# CLEAR INDEX
# -------------------------------
def clear_index():
    global vector_store
    vector_store = None
    if os.path.exists(DB_PATH):
        shutil.rmtree(DB_PATH)
        print("FAISS index cleared")