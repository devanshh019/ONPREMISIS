
from typing import Dict, List, Any, Optional
import numpy as np
from pydantic import BaseModel
from chromadb.utils import embedding_functions

from .config import (
    IMAGE_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    DEFAULT_MODEL_ID,
    DEFAULT_MODEL_NAME,
)
from .model_manager import get_model_for_task

#local ONNX embedding
emb_fn = embedding_functions.DefaultEmbeddingFunction()


class RoutingDecision(BaseModel):
    task_category: str
    selected_model_id: str
    model_name: str
    confidence: float
    routing_reasons: List[str]


CATEGORY_DESCRIPTIONS = {
    "MULTIMODAL_IMAGE_INSPECTION": "Inspect P&ID drawings, visual schematics, diagrams, examine photos, review blueprints, control valves, check bypass lines, optical character recognition OCR, and visual defect inspection.",
    "STANDARDS_AND_GOVERNANCE_REASONING": "Regulatory statutory compliance, safety guidelines, operating procedures, audits, statutory governance, and technical standard rules.",
    "ENGINEERING_MATH_AND_CODE": "Write code, programming functions, scripts, algorithms, mathematical equations, physics simulations, plot engineering curves, render charts, generate diagrams, and execute Python code.",
    "ENTERPRISE_DELIVERABLE_SYNTHESIS": "Generate formatted office reports, structured summary documents, presentation slide decks, and tabular data spreadsheets.",
    "DOCUMENT_RAG_ANALYSIS": "Analyze uploaded text files, summarize written manuals, extract passages from PDFs, and search reference document libraries.",
    "GENERAL_ENGINEERING_REASONING": "Conversational greetings, general inquiries, conceptual discussions, plant engineering explanations, and open-ended technical questions.",
}


class DynamicTaskRouter:
    """ semantic vector router using  embeddings and cosine similarity."""

    def __init__(self):
        self._centroids = {
            cat: (v := np.array(emb_fn([desc])[0])) / (np.linalg.norm(v) or 1.0)
            for cat, desc in CATEGORY_DESCRIPTIONS.items()
        }

    def route_task(self, prompt: str, attachments: Optional[List[Dict[str, Any]]] = None) -> RoutingDecision:
        for a in (attachments or []):
            name = (a.get("name") or a.get("filename") or "").lower()
            if a.get("type", "").startswith("image/") or name.endswith(IMAGE_EXTENSIONS):
                category, reason = "MULTIMODAL_IMAGE_INSPECTION", "Attached visual image/drawing"
                break
            if name.endswith(DOCUMENT_EXTENSIONS):
                category, reason = "DOCUMENT_RAG_ANALYSIS", "Attached reference document"
                break
        else:
            q_vec = np.array(emb_fn([prompt])[0])
            q_unit = q_vec / (np.linalg.norm(q_vec) or 1.0)
            scores = {cat: float(np.dot(q_unit, c)) for cat, c in self._centroids.items()}
            category = max(scores, key=scores.get)
            reason = f"Matched semantic intent ({category}) with score {scores[category]:.3f}"

        target = get_model_for_task(category)
        return RoutingDecision(
            task_category=category,
            selected_model_id=target.get("id", DEFAULT_MODEL_ID),
            model_name=target.get("name", DEFAULT_MODEL_NAME),
            confidence=round(scores[category], 3) if "scores" in locals() else 1.0,
            routing_reasons=[reason, f"Dispatched model: {target.get('name', target.get('id'))}"],
        )


router = DynamicTaskRouter()
