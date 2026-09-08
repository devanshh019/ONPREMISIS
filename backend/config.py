"""
ONPREMISIS Sovereign Backend Configuration
==========================================
Centralized settings for air-gapped agent workbench with zero cloud egress.
"""

import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
STORAGE_DIR = DATA_DIR / "storage"
SEED_DOCS_DIR = DATA_DIR / "seed_documents"
UPLOADS_DIR = STORAGE_DIR / "uploads"
KB_DOCS_DIR = STORAGE_DIR / "kb_docs"
CHROMA_DIR = STORAGE_DIR / "chroma_db"
AUDIT_LOG_FILE = DATA_DIR / "audit_chain.jsonl"
ON_PREMISES_CACHE_DIR = STORAGE_DIR / "on_premises_cache"
MODELS_YAML_PATH = BASE_DIR / "model_registry.yaml"
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"

# Ensure runtime directories exist
for dr in [DATA_DIR, SEED_DOCS_DIR, STORAGE_DIR, UPLOADS_DIR, KB_DOCS_DIR, CHROMA_DIR, ON_PREMISES_CACHE_DIR]:
    dr.mkdir(parents=True, exist_ok=True)

# Air-gapped on-premises environment
os.environ["SENTENCE_TRANSFORMERS_HOME"] = str(ON_PREMISES_CACHE_DIR)
os.environ["HF_HOME"] = str(ON_PREMISES_CACHE_DIR)
os.environ["MPLCONFIGDIR"] = str(ON_PREMISES_CACHE_DIR)

# App Metadata & Themes
APP_NAME = "ONPREMISIS Sovereign Agent Workbench"
APP_VERSION = "2.0.0"
APP_TITLE = "Your AI. Your hardware. No cloud."
ORGANIZATION_NAME = "ONPREMISIS SOVEREIGN AI"
CONFIDENTIAL_TAG = "CONFIDENTIAL // STRICT AIR-GAP"
HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", 8000))
AUDIT_ROOT_SEED_PREFIX = os.environ.get("AUDIT_ROOT_SEED_PREFIX", "SOVEREIGN_GENESIS_ROOT")

# ReAct & QA Confidence Threshold
CONFIDENCE_THRESHOLD = 0.85
MAX_REACT_ITERATIONS = int(os.environ.get("MAX_REACT_ITERATIONS", "5"))

# Local Knowledge Base (RAG)
CHROMA_COLLECTION_NAME = os.environ.get("CHROMA_COLLECTION_NAME", "onpremisis_standards")
RAG_CHUNK_SIZE = 600
RAG_CHUNK_OVERLAP = 100
RAG_DEFAULT_TOP_K = 3

# Local Inference Defaults
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_TIMEOUT_SECONDS = 180.0
OLLAMA_HEALTH_TIMEOUT_SECONDS = 2.0
DEFAULT_MODEL_ID = "qwen2.5:3b"
DEFAULT_MODEL_NAME = "Qwen 2.5 3B Sovereign"
MODEL_TEMPERATURE = 0.2
MODEL_TOP_P = 0.9
MODEL_CONTEXT_WINDOW = 8192
MAX_HISTORY_TURNS = 10

# File Formats
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tiff")
DOCUMENT_EXTENSIONS = (".pdf", ".docx", ".txt", ".csv", ".xlsx", ".pptx", ".md")