from pathlib import Path
from typing import List, Dict, Any
import yaml
from rich import print

from .config import MODELS_YAML_PATH, DEFAULT_MODEL_ID, DEFAULT_MODEL_NAME

_active_runtime_model_id = None
_DEFAULT_MODEL = [{"id": DEFAULT_MODEL_ID, "name": DEFAULT_MODEL_NAME, "default": True, "capabilities": []}]


def load_models() -> List[Dict[str, Any]]:
    try:
        with open(MODELS_YAML_PATH, "r", encoding="utf-8") as f:
            return (yaml.safe_load(f) or {}).get("models", [])
    except (FileNotFoundError, yaml.YAMLError):
        return _DEFAULT_MODEL


def save_model(model_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    model_id = model_data.get("id")
    if not model_id:
        raise ValueError("Model ID is required")

    models = load_models() #if current uploaded model is made default make all other non default
    if model_data.get("default"):
        for m in models:
            m["default"] = False

    for i, m in enumerate(models): #Check for duplicate model id
        if m["id"] == model_id:
            models[i] = model_data
            break
    else:
        models.append(model_data)

    with open(MODELS_YAML_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump({"models": models}, f, sort_keys=False)

    return models

def set_active_model(model_id: str):
    global _active_runtime_model_id
    _active_runtime_model_id = model_id

def get_active_model() -> Dict[str, Any]:
    models = load_models()
    return (
        next((m for m in models if m["id"] == _active_runtime_model_id), None)
        or next((m for m in models if m.get("default")), None)
        or (models[0] if models else {"id": DEFAULT_MODEL_ID, "name": DEFAULT_MODEL_NAME})
    )





def get_model_for_task(task_category: str) -> Dict[str, Any]:
    return next(
        (m for m in load_models() if task_category in m.get("capabilities", [])),
        get_active_model(),
    )


#Debugging part
'''if __name__ == "__main__":
    print(get_model_for_task('LIGHTWEIGHT_CODE'))'''