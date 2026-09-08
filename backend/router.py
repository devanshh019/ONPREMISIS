import re
from typing import Any, Dict, List, Optional
from .config import IMAGE_EXTENSIONS
from .model_manager import get_model_for_task
from .models import RoutingDecision

# Domain semantic profiles
DOMAIN_PROFILES: Dict[str, Dict[str, Any]] = {
    "ENGINEERING_MATH_AND_CODE": {
        "keywords": [
            "python", "script", "code", "simulate", "simulation", "calculate", "calculation",
            "formula", "math", "lmtd", "heat duty", "corrosion rate", "stress", "thickness",
            "asme", "api 510", "numpy", "matplotlib", "plot", "algorithm", "pressure", "t_min"
        ],
        "weight": 1.2,
    },
    "MULTIMODAL_IMAGE_INSPECTION": {
        "keywords": [
            "inspect", "p&id", "diagram", "image", "photo", "drawing", "schematic", "visual",
            "valve", "piping", "ocr", "detect", "defect", "corrosion coupon", "ndt", "ultrasonic"
        ],
        "weight": 1.1,
    },
    "ENTERPRISE_DELIVERABLE_SYNTHESIS": {
        "keywords": [
            "ppt", "pptx", "powerpoint", "presentation", "deck", "slide", "slides", "pages",
            "word", "docx", "doc", "report", "brief", "briefing", "memo", "deliverable",
            "excel", "xlsx", "spreadsheet", "sheet", "sheets", "workbook", "table", "summary"
        ],
        "weight": 1.3,
    },
}


class SovereignModelRouter:
    """Semantic task router matching requests against domain centroids."""

    def __init__(self):
        self.profiles = DOMAIN_PROFILES

    def _tokenize(self, text: str) -> List[str]:
        return [w for w in re.findall(r"\b[a-zA-Z0-9_\-]+\b", text.lower()) if len(w) > 1]

    def route_task(
        self, prompt: str, attachments: Optional[List[Dict[str, Any]]] = None
    ) -> RoutingDecision:
        prompt_lower = prompt.lower()
        tokens = set(self._tokenize(prompt))
        has_images = False

        if attachments:
            for att in attachments:
                name = (att.get("name") or att.get("filename") or "").lower()
                if name.endswith(IMAGE_EXTENSIONS):
                    has_images = True
                    break

        if has_images:
            target_cat = "MULTIMODAL_IMAGE_INSPECTION"
            confidence = 0.98
        elif re.search(r"\b(?:make|create|generate|draft|build)\s+(?:a\s+)?(?:ppt|pptx|powerpoint|presentation|deck|slides?|word|docx?|report|excel|xlsx?|spreadsheet|sheet)\b", prompt_lower) or re.search(r"\b(?:ppt|pptx|powerpoint|slides?)\s+on\b", prompt_lower):
            target_cat = "ENTERPRISE_DELIVERABLE_SYNTHESIS"
            confidence = 0.98
        else:
            scores: Dict[str, float] = {}
            for cat, data in self.profiles.items():
                kw_set = set(data["keywords"])
                common = tokens.intersection(kw_set)
                scores[cat] = len(common) * data["weight"]

            best_cat = max(scores, key=scores.get)
            if scores[best_cat] > 0:
                target_cat = best_cat
                total = sum(scores.values())
                confidence = min(0.99, max(0.80, scores[best_cat] / max(1.0, total) + 0.5))
            else:
                target_cat = "GENERAL_TECHNICAL_ADVISORY"
                confidence = 0.85

        model_meta = get_model_for_task(target_cat)
        model_id = model_meta.get("id", "qwen2.5:3b")
        model_name = model_meta.get("name", "Qwen 2.5 3B Sovereign")

        return RoutingDecision(
            task_category=target_cat,
            selected_model_id=model_id,
            model_name=model_name,
            confidence=round(confidence, 2),
        )


router = SovereignModelRouter()
