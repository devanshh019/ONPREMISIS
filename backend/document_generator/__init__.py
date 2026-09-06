# Industry-Standard Document Generation Package and Service Factory
from pathlib import Path
from ..config import STORAGE_DIR
from .schemas import (
    DocType,
    SlideSpec,
    PptxSpec,
    SectionSpec,
    DocxSpec,
    CellRule,
    XlsxSpec,
    PySpec,
    PythonSpec,
    ExecutionResult,
    CodeDeliverable,
    DocumentSpec,
    DocumentResult,
)
from .theme import Theme, DEFAULT_THEME
from .service import DocumentService
from .renderers.py_executor import PyExecutor

# Default singleton service instance initialized with workspace storage directory
doc_service = DocumentService(Path(STORAGE_DIR), DEFAULT_THEME)
py_executor = PyExecutor(Path(STORAGE_DIR))

__all__ = [
    "DocType",
    "SlideSpec",
    "PptxSpec",
    "SectionSpec",
    "DocxSpec",
    "CellRule",
    "XlsxSpec",
    "PySpec",
    "PythonSpec",
    "ExecutionResult",
    "CodeDeliverable",
    "DocumentSpec",
    "DocumentResult",
    "Theme",
    "DEFAULT_THEME",
    "DocumentService",
    "doc_service",
    "PyExecutor",
    "py_executor",
]
