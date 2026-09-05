# ONPREMISIS

> **Your AI. Your hardware. No cloud.**

ONPREMISIS is a local, on-premise AI workbench prototype designed around the idea of running AI workloads on organization-controlled hardware instead of depending on cloud inference.

The project combines a React-based frontend with a Python backend that provides local Ollama inference, semantic task routing, a local RAG knowledge base, document handling, and model management.

---

## Overview

ONPREMISIS is intended for environments where users may need to work with engineering, governance, standards, and enterprise documents while keeping AI processing within the local environment.

The current codebase includes:

- Local LLM inference through **Ollama**
- Semantic task/model routing
- Multiple configurable local models
- Local RAG using **ChromaDB**
- Local ONNX-based embeddings through Chroma's default embedding function
- PDF and DOCX text extraction
- Image inspection and metadata extraction
- File upload and attachment handling in the web interface
- Knowledge-base upload, search, listing, and deletion
- Model selection and local Ollama health monitoring
- A React + Vite frontend
- A local-first application configuration using loopback addresses

---

## Key Features

### 1. Local Model Inference

The backend communicates with a locally running Ollama instance rather than calling a hosted LLM API.


The inference layer supports:

- Multi-turn chat history
- System prompts
- Image inputs
- Configurable temperature
- Configurable top-p
- Configurable context window
- Model fallback when the requested model is unavailable

---

### 2. Dynamic Task Routing

The router uses local embeddings and cosine similarity to classify a request into a task category.

Current categories include:

- `MULTIMODAL_IMAGE_INSPECTION`
- `STANDARDS_AND_GOVERNANCE_REASONING`
- `ENGINEERING_MATH_AND_CODE`
- `ENTERPRISE_DELIVERABLE_SYNTHESIS`
- `DOCUMENT_RAG_ANALYSIS`
- `GENERAL_ENGINEERING_REASONING`

Attachments can also influence routing. Image files are routed toward multimodal inspection, while supported document attachments are routed toward document/RAG analysis.

The selected task category is mapped to a model through `model_registry.yaml`.

---

### 3. Configurable Local Models

Models and their capabilities are defined in:

```text
backend/model_registry.yaml
```

The current registry contains:

| Model | Purpose |
|---|---|
| `qwen3:8b` | General/Defaultl |
| `qwen2.5-Coder-7b` | Heavy Coding and Maths |
| `mistral:7b` | Enterprise level Deliverable |
| `llava:7b` | Image and OCR Task |

The registry is capability-based, allowing the router to select a model according to the detected task category.

> The models must be installed locally in Ollama before they can be used.

---

### 4. Local RAG Knowledge Base

The knowledge-base module uses:

- ChromaDB
- LangChain Chroma integration
- Local embeddings
- Recursive character text splitting
- PyPDFLoader for PDFs
- `python-docx` for DOCX extraction

Documents are split into chunks and stored in a persistent local Chroma collection.

Default RAG configuration:

```text
Chunk size: 1000
Chunk overlap: 200
Top-K results: 3
Collection: ONPREMISIS_KB
```

Supported document extensions configured by the backend include:

```text
.pdf
.docx
.txt
.csv
.xlsx
.pptx
.md
```

The current text extraction implementation specifically contains handling for PDF and DOCX files, with a generic text-reading fallback for other text-readable formats.

The knowledge base supports:

- Upload/index documents
- Semantic search
- Document listing
- Document deletion
- Knowledge-base statistics
- Automatic ingestion of seed documents when available

---

### 5. Multimodal Image Handling

The project includes a local image inspection module using Pillow.

It can inspect an image file and return metadata such as:

- Filename
- Width
- Height
- Format
- Color mode
- File size
- Aspect ratio

Supported image extensions configured by the backend include:

```text
.png
.jpg
.jpeg
.webp
.bmp
.tiff
```

The task router recognizes image attachments and categorizes them as:

```text
MULTIMODAL_IMAGE_INSPECTION
```

> The current `multimodal_vision.py` module performs local image-file inspection/metadata extraction. It should not be described as a complete visual reasoning engine by itself; actual image reasoning depends on the configured local multimodal model and the surrounding inference workflow.

---

## System Architecture

```text
                    ┌─────────────────────┐
                    │    React Frontend   │
                    │     Vite + Tailwind  │
                    └──────────┬──────────┘
                               │
                               │ Local API
                               ▼
                    ┌─────────────────────┐
                    │   Python Backend    │
                    │                     │
                    │  Task Router        │
                    │  Model Manager      │
                    │  RAG Knowledge Base │
                    │  Inference Engine   │
                    │  Vision Engine      │
                    └───────┬───────┬─────┘
                            │       │
                  ┌─────────┘       └──────────┐
                  ▼                            ▼
        ┌──────────────────┐          ┌──────────────────┐
        │ Local ChromaDB   │          │ Local Ollama     │
        │ Vector Store     │          │ LLM Runtime      │
        └──────────────────┘          └──────────────────┘
```

### Request Flow

```text
User Request
     │
     ▼
Frontend
     │
     ▼
Task Classification
     │
     ▼
Dynamic Task Router
     │
     ├───────────────┐
     ▼               ▼
Knowledge Base    Local Model
   Search           Selection
     │               │
     └───────┬───────┘
             ▼
       Local Inference
             │
             ▼
          Response
```

---

## Project Structure

```text
ONPREMISIS/
│
├── backend/
│   ├── __init__.py
│   ├── config.py
│   ├── inference.py
│   ├── knowledge_base.py
│   ├── model_manager.py
│   ├── model_registry.yaml
│   ├── multimodal_vision.py
│   ├── router.py
│   ├── data/
│   └── test/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   ├── .gitignore
│   ├── .oxlintrc.json
│   ├── README.md
│   ├── vite.config.js
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- JavaScript / JSX
- Lucide React
- clsx

### Backend

- Python
- Ollama HTTP API
- HTTPX
- Pydantic
- NumPy
- PyYAML
- Pillow

### RAG / Document Processing

- ChromaDB
- LangChain Chroma
- LangChain text splitters
- LangChain community document loaders
- PyPDF
- python-docx

### Local AI Runtime

- Ollama
- Open-weight/local models configured through `model_registry.yaml`

---

## Configuration

Most application settings are defined in:

```text
backend/config.py
```

Important settings include:

```python
HOST = "127.0.0.1"
PORT = 8080

OLLAMA_BASE_URL = "http://127.0.0.1:11434"

DEFAULT_MODEL_ID = "gemma3:4b"

MODEL_TEMPERATURE = 0.2
MODEL_TOP_P = 0.85
MODEL_CONTEXT_WINDOW = 4096

RAG_CHUNK_SIZE = 1000
RAG_CHUNK_OVERLAP = 200
RAG_DEFAULT_TOP_K = 3
```

The Ollama endpoint can also be changed using the environment variable:

```bash
OLLAMA_BASE_URL
```

---

## Local Storage

The backend creates local storage directories under:

```text
backend/data/
```

These include:

```text
data/
├── seed_documents/
├── storage/
│   ├── uploads/
│   ├── kb_docs/
│   ├── chroma_db/
│   └── on_premises_cache/
```

The Chroma vector database is persisted locally in:

```text
backend/data/storage/chroma_db/
```

---

## Frontend Development

The frontend is a Vite application.

From the `frontend` directory:

```bash
npm install
npm run dev
```

Other available commands:

```bash
npm run build
npm run lint
npm run preview
```

The frontend communicates with backend API routes using relative `/api/...` paths.

---

## Backend / Local AI Setup

The backend requires Python dependencies from:

```text
requirements.txt
```

Install them using:

```bash
pip install -r requirements.txt
```

Ollama must be installed separately and running locally.

Check Ollama:

```bash
ollama list
```

Pull the default model if it is not already installed:

```bash
ollama pull qwen3:8b
```

Optional models from the current registry:

```bash
ollama pull qwen2.5
ollama pull mistral:7b
ollama pull llava:7b
```

The exact model availability depends on the local Ollama installation and the model registry configuration.

---

## Knowledge Base Workflow

The RAG pipeline follows this general process:

```text
Document
   │
   ▼
Text Extraction
   │
   ▼
Recursive Chunking
   │
   ▼
Local Embedding
   │
   ▼
ChromaDB
   │
   ▼
Semantic Search
   │
   ▼
Relevant Context
```

Documents can be uploaded and searched through the frontend knowledge-base interface.

---

## Frontend Capabilities

The current frontend includes UI components for:

- Chat sessions
- File attachments
- Model settings
- Knowledge-base management
- Deliverable inspection
- Security/sentinel information
- Voice interaction UI
- Image preview/lightbox
- Local model health information
- Scenario selection

The frontend sends chat requests to:

```text
/api/agent/execute
```

and supports local file uploads through:

```text
/api/upload
```

---


## Security / Sovereign Design

The project is designed around a local-first deployment model.

The current configuration uses loopback addresses:

```text
Application: 127.0.0.1:8080
Ollama:       127.0.0.1:11434
```

The architecture is intended to keep model inference and the knowledge-base storage on organization-controlled infrastructure.

However, **"air-gapped" should be understood as a deployment goal/architecture requirement rather than automatically guaranteed by the application code alone**. A genuinely air-gapped deployment also requires appropriate network configuration, firewall rules, operating-system controls, hardware policies, and operational procedures.

---

## Current Scope and Limitations

This repository is an evolving prototype.

Important points when evaluating the current implementation:

- Local Ollama inference is implemented through the Ollama HTTP API.
- Model routing is implemented using semantic embeddings and task categories.
- RAG ingestion and similarity search are implemented with ChromaDB.
- PDF and DOCX extraction are implemented directly in the knowledge-base module.
- Image inspection currently provides file-level image metadata; advanced visual reasoning depends on the local multimodal model/workflow.
- The configured supported-extension list is broader than the specialized extraction logic; additional formats may require dedicated parsers.
- A production air-gapped environment requires infrastructure-level network isolation in addition to application-level local endpoints.
- The project should be tested against the exact local models and hardware intended for deployment before production use.

---

## Intended Use

ONPREMISIS is being developed as a foundation for a **sovereign, on-premise AI workbench** where local models can be combined with enterprise knowledge and task-specific routing.

Potential application areas include:

- Engineering document analysis
- Standards and governance queries
- Internal knowledge retrieval
- Engineering calculations and coding assistance
- Enterprise document workflows
- Local multimodal inspection workflows

These represent the project's intended direction; actual capabilities should be evaluated against the current implementation.

---

## SIH Context

This project is being developed in the context of the **Smart India Hackathon 2026** problem focused on a sovereign on-premise agentic AI workbench for confidential industrial work.

The repository is intended to support the broader goal of combining:

```text
Local Models
     +
Task Routing
     +
RAG
     +
Multimodal Inputs
     +
Enterprise Workflows
     =
Sovereign AI Workbench
```

---



## Project Status

**Status:** Active development / prototype

The architecture and feature set may change as the project evolves toward the final SIH implementation.

---

## Team

**Project:** ONPREMISIS  
**Focus:** Sovereign / On-Premise AI Workbench  
**Context:** Smart India Hackathon 2026

