"""
Model-agnostic extraction of executable Python from an LLM's raw text output.

Progressively looser extraction strategies validated with ast.parse before sandbox execution.
"""
from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class ExtractionResult:
    code: Optional[str]
    strategy: str
    valid_syntax: bool
    error: Optional[str] = None


_FENCE_RE = re.compile(r"```(?:python|py)?\s*\n(.*?)```", re.DOTALL | re.IGNORECASE)
_ACTION_RE = re.compile(
    r"(?:\*\*)?Action:?(?:\*\*)?\s*`?([a-zA-Z0-9_\-]+)`?\s*"
    r"(?:(?:\*\*)?(?:Action Input|Code|Input):?(?:\*\*)?\s*)?(.*?)(?=(?:\*\*)?Action:|$)",
    re.DOTALL | re.IGNORECASE,
)


def _strip_fences(text: str) -> str:
    """Peel off markdown fences, possibly nested/doubled."""
    text = text.strip()
    for _ in range(2):
        m = _FENCE_RE.search(text)
        if m and m.group(1).strip():
            text = m.group(1).strip()
        else:
            break
    return text


def _try_json_args(raw: str) -> Optional[str]:
    """Strategy A: well-formed {\"code\": \"...\"}"""
    try:
        obj = json.loads(raw.strip())
        if isinstance(obj, dict) and "code" in obj:
            return _strip_fences(obj["code"])
    except (json.JSONDecodeError, ValueError):
        pass
    return None


def _try_json_loose(raw: str) -> Optional[str]:
    """Strategy B: JSON with unescaped multi-line code string."""
    m = re.search(r'"code"\s*:\s*"(.*)"\s*\}?\s*$', raw.strip(), re.DOTALL)
    if m:
        candidate = m.group(1)
        candidate = candidate.replace(r"\n", "\n").replace(r'\"', '"')
        return _strip_fences(candidate)
    return None


def _try_action_block(raw: str) -> Optional[str]:
    """Strategy C: ReAct Action:/Action Input:/Code: template."""
    matches = _ACTION_RE.findall(raw)
    for name, args in matches:
        if any(k in name.lower() for k in ["execute", "python", "code", "calc"]):
            code = _try_json_args(args) or _try_json_loose(args) or _try_fenced_block(args)
            if code:
                return code
    return None


def _try_fenced_block(raw: str) -> Optional[str]:
    """Strategy D: bare fenced markdown code block."""
    m = _FENCE_RE.search(raw)
    if m and m.group(1).strip():
        return m.group(1).strip()
    return None


def _try_bare_code(raw: str) -> Optional[str]:
    """Strategy E: raw un-fenced python lines."""
    stripped = raw.strip()
    if re.match(r"^\s*(import |from |def |print\(|plt\.|np\.|#)", stripped):
        return stripped
    return None


def extract_code(model_output: str) -> ExtractionResult:
    """Try each strategy in order of confidence with AST validation."""
    strategies = [
        ("json_strict", lambda: _try_json_args(model_output)),
        ("action_block", lambda: _try_action_block(model_output)),
        ("json_loose", lambda: _try_json_loose(model_output)),
        ("fenced_block", lambda: _try_fenced_block(model_output)),
        ("bare_code", lambda: _try_bare_code(model_output)),
    ]

    last_candidate, last_strategy, last_err = None, None, None
    for name, fn in strategies:
        candidate = fn()
        if not candidate:
            continue
        try:
            ast.parse(candidate)
            return ExtractionResult(code=candidate, strategy=name, valid_syntax=True)
        except SyntaxError as e:
            last_candidate, last_strategy, last_err = candidate, name, str(e)

    if last_candidate is not None:
        return ExtractionResult(code=last_candidate, strategy=last_strategy,
                                 valid_syntax=False, error=last_err)
    return ExtractionResult(code=None, strategy="none", valid_syntax=False,
                             error="no code found by any strategy")