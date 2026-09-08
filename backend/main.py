import json
import os
import shutil
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .config import DATA_DIR, STORAGE_DIR, MODELS_YAML_PATH, FRONTEND_DIST_DIR, DEFAULT_MODEL_ID, HOST, PORT, APP_NAME, APP_TITLE, APP_VERSION, CONFIDENTIAL_TAG
from .engine import agent_engine
from .inference import inference_engine
from .knowledge_base import knowledge_base
from .model_manager import get_active_model, load_models, save_model, set_active_model
from .models import ApprovalRequest, TaskExecuteRequest, ModelSelectRequest
from .network_guard import sentinel
from .router import router
from .scenarios import PRELOADED_SCENARIOS


class RouteTestRequest(BaseModel):
    prompt: str
    attachments: Optional[List[Dict[str, Any]]] = None


class KBSearchRequest(BaseModel):
    query: str
    top_k: int = 3


@asynccontextmanager
async def lifespan(app: FastAPI):
    status = sentinel.get_security_status()
    print(f"[ONPREMISIS INITIALIZATION] Air-gap enforced: {status.get('air_gap_enforced', True)}.")
    yield


app = FastAPI(
    title=APP_TITLE,
    description="Air-Gapped Sovereign ReAct Agent Platform with LangGraph & Hybrid RAG",
    version=APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health & Status
# ---------------------------------------------------------------------------

@app.get("/api/health")
def get_health():
    sec = sentinel.get_security_status()
    inf = inference_engine.check_local_ollama_health()
    kb_stats = knowledge_base.get_stats()
    act = get_active_model()
    return {
        "status": "HEALTHY",
        "air_gap_enforced": sec.get("air_gap_enforced", True),
        "air_gap_verified": sec.get("air_gap_enforced", True),
        "local_inference": "ONLINE" if inf.get("available") else "OFFLINE",
        "inference_info": inf,
        "ollama_backend": inf,
        "active_foundation_model": act.get("name", "Qwen 2.5 3B Sovereign") if act else "Qwen 2.5 3B Sovereign",
        "active_model_id": act.get("id", "qwen2.5:3b") if act else "qwen2.5:3b",
        "active_model": act,
        "knowledge_base": kb_stats,
        "organization": APP_NAME,
        "security_classification": CONFIDENTIAL_TAG,
        "engine_mode": "LangGraph StateGraph (ReAct)",
    }


@app.get("/api/scenarios")
def get_scenarios():
    """Returns pre-loaded industrial scenarios for one-click testing."""
    return {"scenarios": PRELOADED_SCENARIOS}


@app.post("/api/route")
def test_route(req: RouteTestRequest):
    """Evaluates task intent, attachment features, and selects specialized model persona."""
    decision = router.route_task(req.prompt, req.attachments)
    data = decision.model_dump()

    inf = inference_engine.check_local_ollama_health()
    installed = inf.get("models", [])
    target = decision.selected_model_id
    is_fallback = bool(installed and target not in installed)

    if is_fallback:
        active = installed[0] if installed else DEFAULT_MODEL_ID
    else:
        active = target

    data["is_fallback"] = is_fallback
    data["requested_model"] = target
    data["active_model"] = active
    if is_fallback:
        data["fallback_message"] = (
            f"Requested '{target}' not found locally. Routing to active model '{active}'."
        )
    return data


# ---------------------------------------------------------------------------
# LangGraph Agent Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/agent/execute")
def execute_task(req: TaskExecuteRequest):
    try:
        res = agent_engine.execute_task(
            prompt=req.prompt,
            attachments=req.attachments,
            override_model=req.override_model,
            history=req.history,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/stream")
def stream_task(req: TaskExecuteRequest):
    def event_generator():
        try:
            for ev in agent_engine.stream_task(
                prompt=req.prompt,
                attachments=req.attachments,
                override_model=req.override_model,
                history=req.history,
            ):
                yield f"data: {json.dumps(ev)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/agent/approve")
def approve_deliverables(req: ApprovalRequest):
    """Authorized supervisor sign-off releasing held deliverables when confidence < 85%."""
    try:
        res = agent_engine.approve_and_generate_deliverables(
            task_id=req.task_id,
            supervisor_name=req.supervisor_name or "Lead Plant Inspection Engineer",
            decision_notes=req.decision_notes or "Approved.",
            authorized=True,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agent/graph")
def get_agent_graph():
    """Returns the LangGraph StateGraph topology, phases, nodes, and transitions."""
    return agent_engine.get_graph_topology()


# ---------------------------------------------------------------------------
# File & Document Downloads & Artifacts
# ---------------------------------------------------------------------------

@app.get("/api/documents/download/{filename}")
def download_document(filename: str):
    path = STORAGE_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Deliverable '{filename}' not found.")
    return FileResponse(path, filename=filename)


@app.get("/api/artifacts/{path:path}")
def get_artifact(path: str):
    """Serves generated Office deliverables, plots, and uploaded documents."""
    file_path = Path(STORAGE_DIR) / path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Artifact file not found.")

    media_types = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".pdf": "application/pdf",
        ".py": "text/plain",
        ".json": "application/json",
        ".txt": "text/plain",
        ".csv": "text/plain",
    }
    ext = file_path.suffix.lower()
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type=media_type,
    )


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    target = STORAGE_DIR / file.filename
    with open(target, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {
        "success": True,
        "filename": file.filename,
        "local_path": str(target),
        "size_bytes": target.stat().st_size,
    }


# ---------------------------------------------------------------------------
# Knowledge Base (Hybrid RAG) Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/knowledge-base/upload")
@app.post("/api/rag/upload")
async def rag_upload(file: UploadFile = File(...)):
    target = STORAGE_DIR / file.filename
    with open(target, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        res = knowledge_base.ingest_file(target, original_filename=file.filename)
        return {
            "success": True,
            "filename": file.filename,
            "doc_id": res.get("document", {}).get("doc_id"),
            "indexed_chunks": res.get("indexed_chunks", 0),
            "document": res.get("document"),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/knowledge-base/documents")
def list_kb_documents():
    return {
        "documents": knowledge_base.list_documents(),
        "stats": knowledge_base.get_stats(),
    }


@app.get("/api/rag/documents")
def rag_list_documents():
    return {"documents": knowledge_base.list_documents()}


@app.delete("/api/knowledge-base/documents/{doc_id}")
@app.delete("/api/rag/documents/{doc_id}")
def rag_delete_document(doc_id: str):
    success = knowledge_base.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"success": True, "doc_id": doc_id, "deleted_doc_id": doc_id}


@app.post("/api/knowledge-base/search")
def search_kb(req: KBSearchRequest):
    results = knowledge_base.search(query=req.query, top_k=req.top_k)
    return {"results": results}


@app.get("/api/rag/search")
def rag_search(q: str, top_k: int = 3):
    results = knowledge_base.search(query=q, top_k=top_k)
    return {"query": q, "results": results}


@app.get("/api/rag/stats")
def rag_stats():
    return knowledge_base.get_stats()


# ---------------------------------------------------------------------------
# Air-Gap Security Sentinel Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/security/status")
def get_security_status():
    return sentinel.get_security_status()


@app.get("/api/security/audit-chain")
def get_audit_chain(limit: int = 50):
    return {"audit_events": sentinel.get_audit_chain(limit=limit)}


@app.get("/api/security/certificate")
def get_sovereign_certificate():
    return sentinel.generate_sovereign_certificate()


# ---------------------------------------------------------------------------
# Model Registry Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/models")
def get_models():
    ollama_info = inference_engine.check_local_ollama_health()
    configured_models = load_models()
    active = get_active_model()
    return {
        "models": configured_models,
        "active_model": active,
        "detected_models": ollama_info.get("models", []),
    }


@app.post("/api/models/select")
def select_model(req: ModelSelectRequest):
    set_active_model(req.model_id)
    models = load_models()
    for m in models:
        m["default"] = (m["id"] == req.model_id)
    try:
        with open(MODELS_YAML_PATH, "w", encoding="utf-8") as f:
            yaml.safe_dump({"models": models}, f, sort_keys=False)
    except Exception:
        pass
    return {"success": True, "active_model_id": req.model_id, "active_model": get_active_model()}


@app.post("/api/models/register")
def register_model(model_data: Dict[str, Any]):
    models = save_model(model_data)
    return {"success": True, "models": models}


# ---------------------------------------------------------------------------
# Frontend Static Files Mount
# ---------------------------------------------------------------------------

if FRONTEND_DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
