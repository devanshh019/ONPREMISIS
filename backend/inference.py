# Local Ollama Inference Engine and Multi-Turn LLM Client
import httpx
from typing import Dict, List, Any, Optional, Tuple

from .config import (
    OLLAMA_BASE_URL,
    OLLAMA_TIMEOUT_SECONDS,
    OLLAMA_HEALTH_TIMEOUT_SECONDS,
    DEFAULT_MODEL_ID,
    MODEL_TEMPERATURE,
    MODEL_TOP_P,
    MODEL_CONTEXT_WINDOW,
    MAX_HISTORY_TURNS,
)
from .model_manager import get_active_model, set_active_model


class LocalSovereignInference:
    """Client for local Ollama HTTP API."""

    def __init__(self):
        self.ollama_url = OLLAMA_BASE_URL
        self.client = httpx.Client(timeout=OLLAMA_TIMEOUT_SECONDS)
        self.selected_model: Optional[str] = None

    def set_target_model(self, model_tag: str):
        self.selected_model = model_tag
        set_active_model(model_tag)

    def check_local_ollama_health(self) -> Dict[str, Any]:
        """Read-only check: is Ollama running, and what models are installed."""
        active_id = get_active_model().get("id", DEFAULT_MODEL_ID)
        try:
            resp = self.client.get(
                f"{self.ollama_url}/api/tags", timeout=OLLAMA_HEALTH_TIMEOUT_SECONDS
            )
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", []) if m.get("name")]
                return {"available": True, "models": models, "active_model": active_id, "endpoint": self.ollama_url}
        except Exception:
            pass
        return {"available": False, "models": [], "active_model": active_id, "endpoint": self.ollama_url}

    def _resolve_target_model(
        self, model_id: Optional[str], installed: List[str]
    ) -> Tuple[str, bool, Optional[str]]:
        """Picks (target_model, is_fallback, requested_model)."""
        if model_id and (not installed or model_id in installed):
            return model_id, False, model_id

        if self.selected_model and self.selected_model in installed:
            return self.selected_model, False, self.selected_model

        default = get_active_model().get("id", DEFAULT_MODEL_ID)
        fallback = (
            default if default in installed
            else DEFAULT_MODEL_ID if DEFAULT_MODEL_ID in installed
            else installed[0] if installed
            else DEFAULT_MODEL_ID
        )
        return fallback, model_id is not None and model_id != fallback, model_id
   
    def _build_messages_payload(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        images: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Builds the /api/chat messages list, filtering stale/duplicate/system-log history."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        clean_history = [
            h for h in (history or [])
            if h.get("content")
            and not h["content"].startswith("Execution Notice:")
            and h["content"] != prompt
        ]
        for h in clean_history[-MAX_HISTORY_TURNS:]:
            messages.append({
                "role": "user" if h.get("role") == "user" else "assistant",
                "content": h["content"],
            })

        user_msg: Dict[str, Any] = {"role": "user", "content": prompt}
        if images:
            user_msg["images"] = images
        messages.append(user_msg)
        return messages

    def _offline_response(self) -> Dict[str, Any]:
        return {
            "success": False,
            "model_online": False,
            "response": (
                "> [!WARNING]\n"
                f"> **Local Inference Engine Offline**: Could not connect to Ollama at `{self.ollama_url}`.\n\n"
                "**To start Ollama**:\n"
                "```bash\n"
                f"ollama run {DEFAULT_MODEL_ID}\n"
                "```"
            ),
            "model_used": "None (Ollama Offline)",
        }

    def _error_response(self, target_model: str, message: str) -> Dict[str, Any]:
        return {
            "success": False,
            "model_online": False,
            "response": f"> [!WARNING]\n> {message}",
            "model_used": f"Ollama ({target_model})",
        }

    def generate(
        self,
        prompt: str,
        model_id: Optional[str] = None,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        images: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        health = self.check_local_ollama_health()
        if not health["available"]:
            return self._offline_response()

        target_model, is_fallback, requested_model = self._resolve_target_model(model_id, health["models"])
        set_active_model(target_model)
        messages_payload = self._build_messages_payload(prompt, system_prompt, history, images)

        try:
            resp = self.client.post(
                f"{self.ollama_url}/api/chat",
                json={
                    "model": target_model,
                    "messages": messages_payload,
                    "stream": False,
                    "options": {
                        "temperature": MODEL_TEMPERATURE,
                        "top_p": MODEL_TOP_P,
                        "num_ctx": MODEL_CONTEXT_WINDOW,
                    },
                },
            )
            if resp.status_code == 200:
                content = resp.json().get("message", {}).get("content", "").strip()
                return {
                    "success": True,
                    "response": content,
                    "model_used": target_model,
                    "is_fallback": is_fallback,
                    "requested_model": requested_model,
                }
            return self._error_response(target_model, f"**Ollama HTTP Error {resp.status_code}**: {resp.text}")
        except Exception as e:
            return self._error_response(target_model, f"**Inference Error**: {e}")



inference_engine = LocalSovereignInference()

if __name__ =='__main__':
    print(inference_engine.set_target_model('qwen2.5:3b'))
