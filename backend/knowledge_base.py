import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import docx
from chromadb.utils import embedding_functions
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import (
    CHROMA_COLLECTION_NAME,
    CHROMA_DIR,
    RAG_CHUNK_OVERLAP,
    RAG_CHUNK_SIZE,
    RAG_DEFAULT_TOP_K,
    SEED_DOCS_DIR,
)

# Air-gapped on-premises ONNX embedding function (384-dimensional MiniLM)
emb_fn = embedding_functions.DefaultEmbeddingFunction()


class LocalEmbeddings:
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return emb_fn(texts)

    def embed_query(self, text: str) -> List[float]:
        return emb_fn([text])[0]


splitter = RecursiveCharacterTextSplitter(
    chunk_size=RAG_CHUNK_SIZE,
    chunk_overlap=RAG_CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", "; ", " "],
)

vec_store = Chroma(
    collection_name=CHROMA_COLLECTION_NAME,
    embedding_function=LocalEmbeddings(),
    persist_directory=str(CHROMA_DIR),
)


class HybridReranker:
    """
    On-premises Hybrid Cross-Scoring Reranker.
    Combines dense semantic vector proximity with BM25-style lexical term frequency
    and metadata title affinity to rank the most authoritative excerpts first.
    """

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return [w for w in re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", text.lower()) if len(w) > 1]

    @classmethod
    def rerank(cls, query: str, candidate_docs: List[tuple]) -> List[Dict[str, Any]]:
        query_tokens = cls._tokenize(query)
        q_set = set(query_tokens) if query_tokens else set()

        scored = []
        for doc, dist in candidate_docs:
            content = doc.page_content
            title = doc.metadata.get("title", "")
            content_tokens = cls._tokenize(content)

            # 1. Dense Semantic Proximity (Cosine distance in [0, 2]: sim = 1.0 - dist)
            s_dense = max(0.0, min(1.0, 1.0 - dist))

            # 2. BM25-Style Lexical Term Overlap with frequency saturation
            overlap = 0.0
            if q_set and content_tokens:
                freq: Dict[str, int] = {}
                for t in content_tokens:
                    if t in q_set:
                        freq[t] = freq.get(t, 0) + 1
                overlap = sum((cnt / (cnt + 1.2)) for cnt in freq.values()) / max(1, len(q_set))
            s_lex = min(1.0, overlap)

            # 3. Title & Regulatory Standard Token Affinity
            s_title = 0.0
            if title and q_set:
                t_tokens = set(cls._tokenize(title))
                matched = sum(1 for t in q_set if t in t_tokens)
                s_title = matched / max(1, len(q_set))

            # 4. Multi-Factor Rerank Fusion Score
            final_score = round((0.60 * s_dense) + (0.35 * s_lex) + (0.05 * s_title), 3)

            scored.append({
                "doc_id": doc.metadata.get("doc_id", "UNKNOWN"),
                "title": title or "Document",
                "filename": doc.metadata.get("filename", title or "document.txt"),
                "excerpt": content[:300] + ("..." if len(content) > 300 else ""),
                "full_content": content,
                "relevance_score": final_score,
            })

        scored.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored


class LocalRAGKnowledgeBase:
    """Sovereign Knowledge Base managing ingestion, chunking, and hybrid search."""

    @staticmethod
    def extract_text_from_file(file_path: Path or str) -> str:
        p = Path(file_path)
        ext = p.suffix.lower()

        if ext == ".docx":
            try:
                doc = docx.Document(str(p))
                paragraphs = [para.text.strip() for para in doc.paragraphs if para.text.strip()]
                return "\n\n".join(paragraphs)
            except Exception as e:
                return f"[DOCX Extraction Error: {e}]"
        elif ext == ".pdf":
            try:
                loader = PyPDFLoader(str(p))
                pages = loader.load()
                return "\n\n".join([page.page_content.strip() for page in pages if page.page_content.strip()])
            except Exception as e:
                return f"[PDF Extraction Error: {e}]"
        else:
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            except Exception as e:
                return f"[Text Read Error: {e}]"

    def ingest_file(self, file_path: Path or str, original_filename: Optional[str] = None) -> Dict[str, Any]:
        """Ingests, chunks, and indexes a file into ChromaDB with deduplication."""
        p = Path(file_path)
        name = original_filename or p.name
        doc_id = f"DOC-{int(time.time() * 1000)}"
        ext = p.suffix.lower()

        if ext == ".pdf":
            try:
                docs = PyPDFLoader(str(p)).load()
                for d in docs:
                    d.metadata["doc_id"] = doc_id
                    d.metadata["title"] = name
                    d.metadata["filename"] = name
            except Exception:
                raw_text = self.extract_text_from_file(p)
                docs = [Document(page_content=raw_text, metadata={"doc_id": doc_id, "title": name, "filename": name})]
        else:
            raw_text = self.extract_text_from_file(p)
            if not raw_text or raw_text.startswith("["):
                raise ValueError(f"Could not extract readable text from '{name}'.")
            docs = [Document(page_content=raw_text, metadata={"doc_id": doc_id, "title": name, "filename": name})]

        chunks = splitter.split_documents(docs)
        if not chunks:
            raise ValueError(f"Document '{name}' contains no indexable text.")

        # Remove prior chunks with identical filename/title
        existing_data = vec_store.get(include=["metadatas"])
        ids_to_del = [
            id_val for id_val, m in zip(existing_data.get("ids", []), existing_data.get("metadatas", []))
            if m and (m.get("filename") == name or m.get("title") == name)
        ]
        if ids_to_del:
            vec_store.delete(ids=ids_to_del)

        vec_store.add_documents(chunks)
        return {
            "success": True,
            "filename": name,
            "doc_id": doc_id,
            "indexed_chunks": len(chunks),
            "document": {"doc_id": doc_id, "filename": name, "title": name},
        }

    def search(self, query: str, top_k: int = RAG_DEFAULT_TOP_K) -> List[Dict[str, Any]]:
        """Dense retrieval of candidate vectors followed by hybrid cross-scoring reranker."""
        candidate_count = max(top_k * 3, 6)
        candidates = vec_store.similarity_search_with_score(query, k=candidate_count)
        if not candidates:
            return []

        reranked = HybridReranker.rerank(query, candidates)
        return reranked[:top_k]

    def list_documents(self) -> List[Dict[str, Any]]:
        metas = vec_store.get(include=["metadatas"]).get("metadatas", [])
        seen = {}
        for m in metas:
            if m and m.get("doc_id") and m["doc_id"] not in seen:
                seen[m["doc_id"]] = {
                    "doc_id": m["doc_id"],
                    "title": m.get("title", "Document"),
                    "filename": m.get("filename", "document.txt"),
                }
        return list(seen.values())

    def delete_document(self, doc_id: str) -> bool:
        ids = vec_store.get(where={"doc_id": doc_id}).get("ids", [])
        if ids:
            vec_store.delete(ids=ids)
            return True
        return False

    def get_stats(self) -> Dict[str, Any]:
        ids = vec_store.get().get("ids", [])
        return {"total_documents": len(self.list_documents()), "total_chunks": len(ids)}


def _seed_db():
    if SEED_DOCS_DIR.exists():
        existing_metas = vec_store.get(include=["metadatas"]).get("metadatas", [])
        existing_names = set(m.get("filename", m.get("title")) for m in existing_metas if m)
        for p in SEED_DOCS_DIR.glob("*.*"):
            if p.name not in existing_names:
                try:
                    knowledge_base.ingest_file(p, original_filename=p.name)
                except Exception:
                    pass


knowledge_base = LocalRAGKnowledgeBase()
_seed_db()
