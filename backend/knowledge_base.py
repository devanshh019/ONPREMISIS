import time
from pathlib import Path
from typing import Dict, List, Any, Union
 
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_core.documents import Document
 
from .config import (
    CHROMA_DIR,
    SEED_DOCS_DIR,
    RAG_CHUNK_SIZE,
    RAG_CHUNK_OVERLAP,
    RAG_DEFAULT_TOP_K,
    OLLAMA_BASE_URL,
)
 
# Embeddings run through the local Ollama server (same one used for chat)
# instead of chromadb's DefaultEmbeddingFunction, which downloads its model
# from the internet on first use. Requires: ollama pull nomic-embed-text
embeddings = OllamaEmbeddings(model="nomic-embed-text", base_url=OLLAMA_BASE_URL)
 
splitter = RecursiveCharacterTextSplitter(
    chunk_size=RAG_CHUNK_SIZE,
    chunk_overlap=RAG_CHUNK_OVERLAP,
)
 
vec_store = Chroma(
    collection_name="kavach_standards",
    embedding_function=embeddings,
    persist_directory=str(CHROMA_DIR),
)
 
retriever = vec_store.as_retriever(search_kwargs={"k": RAG_DEFAULT_TOP_K})