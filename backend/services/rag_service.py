import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import WebBaseLoader

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
FAISS_INDEX_PATH = os.path.join(DATA_DIR, "faiss_index")

# Initialize embeddings and LLM locally
def get_embeddings_and_llm():
    print("Initializing Ollama LLM and Embeddings...")
    from langchain_ollama import OllamaEmbeddings, ChatOllama
    emb = OllamaEmbeddings(model="llama3.1", base_url="http://localhost:11434")
    llm_instance = ChatOllama(model="llama3.1", base_url="http://localhost:11434", temperature=0)
    return emb, llm_instance

embeddings, llm = get_embeddings_and_llm()

# Using basic QA prompt for RAG
prompt = ChatPromptTemplate.from_template(
    """Answer the user's question based ONLY on the provided context.
    If you cannot answer based on the context, say "I don't know based on the provided documents".
    
    Context:
    {context}
    
    Question: {input}
    
    Answer:"""
)

def process_pdf(file_path: str):
    """Load a PDF, split it, and index it into FAISS."""
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_documents(documents)
    
    # Store in FAISS
    if os.path.exists(FAISS_INDEX_PATH):
        vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
        vector_store.add_documents(chunks)
    else:
        vector_store = FAISS.from_documents(chunks, embeddings)
        
    vector_store.save_local(FAISS_INDEX_PATH)
    return len(chunks)

def list_documents():
    """List all physical PDF documents currently stored in the data directory."""
    if not os.path.exists(DATA_DIR):
        return []
    return [f for f in os.listdir(DATA_DIR) if f.endswith('.pdf')]

import shutil

def delete_and_rebuild_index(filename: str) -> bool:
    """Deletes a designated file from DATA_DIR and rebuilds the FAISS index globally."""
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        return False
        
    # 1. Delete the physical source document
    os.remove(file_path)
    
    # 2. Obliterate the old FAISS embeddings directory locally
    if os.path.exists(FAISS_INDEX_PATH):
        shutil.rmtree(FAISS_INDEX_PATH)
        
    # 3. Look for any remaining PDFs strictly tracking them into a fresh local database
    remaining_files = list_documents()
    for doc in remaining_files:
        process_pdf(os.path.join(DATA_DIR, doc))
        
    return True

def process_url(url: str):
    """Load a URL, scrape text, split it, and index it into FAISS."""
    loader = WebBaseLoader(url)
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_documents(documents)
    
    # Store in FAISS
    if os.path.exists(FAISS_INDEX_PATH):
        vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
        vector_store.add_documents(chunks)
    else:
        vector_store = FAISS.from_documents(chunks, embeddings)
        
    vector_store.save_local(FAISS_INDEX_PATH)
    return len(chunks)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def query_rag(question: str) -> str:
    """Query the FAISS index using the question and generate an answer."""
    if not os.path.exists(FAISS_INDEX_PATH):
        return "Knowledge base is empty. Please upload documents first."
        
    vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
    
    rag_chain = (
        {"context": retriever | format_docs, "input": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return rag_chain.invoke(question)
