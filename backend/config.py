import os
from pathlib import Path


#DIR CONFIG
BASE_DIR = Path(__file__).resolve().parent  #Backend Root Path
PROJECT_ROOT = BASE_DIR.parent #Proj Root Path
DATA_DIR = BASE_DIR / "data"  #Dir to handle all data files
SEED_DOCS_DIR = DATA_DIR / "seed_documents"  # standard documents for KB
STORAGE_DIR = DATA_DIR / "storage"   #Store Files Generated As Per User Request
UPLOADS_DIR = STORAGE_DIR / "uploads"  #Stores Files Uploaded by user
KB_DOCS_DIR = STORAGE_DIR / "kb_docs" #Store Files Added By User To Kb
CHROMA_DIR = STORAGE_DIR / "chroma_db"  #Vec Store
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist" #Frontend Path
ON_PREMISES_CACHE_DIR = STORAGE_DIR / "on_premises_cache"
MODELS_YAML_PATH=BASE_DIR/'model_registry.yaml'
for dr in [DATA_DIR, SEED_DOCS_DIR, STORAGE_DIR, UPLOADS_DIR, KB_DOCS_DIR, CHROMA_DIR]:
    dr.mkdir(parents=True, exist_ok=True)


#APP CONFIG
APP_NAME='ONPREMISIS'
APP_VERSION='1.0.0'
APP_TITLE='Your AI. Your hardware. No cloud.'
HOST='127.0.0.1'
PORT=8080

#OLLAMA SETTINGS
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_TIMEOUT_SECONDS = 180.0  #Response Timeout Limit
OLLAMA_HEALTH_TIMEOUT_SECONDS = 1.0 #health check timeout limit
DEFAULT_MODEL_ID = "gemma3:4b"
DEFAULT_MODEL_NAME = "GEMMA3 - 4B"
MODEL_TEMPERATURE = 0.2 
MODEL_TOP_P = 0.95 #Forces Ollama to use token with prob above 95%
MODEL_CONTEXT_WINDOW = 4096
MAX_HISTORY_TURNS = 10 #Last 10 Chat history Used for context of chat

