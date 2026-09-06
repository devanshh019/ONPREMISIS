# Pydantic Models and LLM Tool-Calling Contract Schemas
"""
Contract between the LLM tool-call output and the render layer.

This IS the "industry standard JSON" the model has to produce. Define it
once, validate against it always. If the model's tool call doesn't match
this shape, Pydantic raises — you get a 422 with a precise error, not a
silently-broken document.
"""
from __future__ import annotations

from enum import Enum
from typing import Dict, Any, List, Optional, Union, Literal

from pydantic import BaseModel, Field


class DocType(str, Enum):
    PPTX = "pptx"
    DOCX = "docx"
    XLSX = "xlsx"
    PY = "py"
    PYTHON = "python"


# ---------------------------------------------------------------------------
# PPTX
# ---------------------------------------------------------------------------
class SlideSpec(BaseModel):
    title: str
    bullets: List[str] = Field(default_factory=list)


class PptxSpec(BaseModel):
    doc_type: Literal[DocType.PPTX] = DocType.PPTX
    title: str
    subtitle: Optional[str] = None
    slides: List[SlideSpec] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# DOCX
# ---------------------------------------------------------------------------
class SectionSpec(BaseModel):
    heading: str
    content: str


class DocxSpec(BaseModel):
    doc_type: Literal[DocType.DOCX] = DocType.DOCX
    title: str
    subject: Optional[str] = None
    sections: List[SectionSpec] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# XLSX
# ---------------------------------------------------------------------------
class CellRule(BaseModel):
    """Config-driven conditional formatting."""
    match_values: List[str]
    color_hex: str  # e.g. "16A34A"
    bold: bool = True


class XlsxSpec(BaseModel):
    doc_type: Literal[DocType.XLSX] = DocType.XLSX
    title: str
    sheet_name: str = "Sheet1"
    headers: List[str]
    rows: List[List[Union[str, int, float]]] = Field(default_factory=list)
    rules: List[CellRule] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# PYTHON — a fundamentally different kind of deliverable: execution & verification
# ---------------------------------------------------------------------------
class PySpec(BaseModel):
    doc_type: Literal[DocType.PY, DocType.PYTHON] = DocType.PY
    title: str = "script"
    code: str
    timeout_seconds: int = Field(default=10, le=60)
    requirements: List[str] = Field(default_factory=list)


# Alias for backwards compatibility
PythonSpec = PySpec


class ExecutionResult(BaseModel):
    """What actually happened when the code ran in the sandbox."""
    success: bool
    stdout: str
    stderr: str
    exit_code: int
    artifact_files: List[str] = Field(default_factory=list)  # e.g. saved plots, CSVs
    plots: List[Dict[str, str]] = Field(default_factory=list)
    duration_ms: int = 0
    timed_out: bool = False


class CodeDeliverable(BaseModel):
    filename: str
    path: str
    doc_type: Literal[DocType.PY, DocType.PYTHON] = DocType.PY
    size_bytes: int
    execution: ExecutionResult


# Discriminated union
DocumentSpec = Union[PptxSpec, DocxSpec, XlsxSpec, PySpec]


class DocumentResult(BaseModel):
    """One consistent return shape for every renderer."""
    filename: str
    path: str
    doc_type: DocType
    size_bytes: int
