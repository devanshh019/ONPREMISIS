# Document Generation Service Facade and Renderer Dispatcher
from __future__ import annotations

import re
import uuid
from pathlib import Path

from .schemas import DocumentSpec, DocumentResult, DocType
from .theme import Theme, DEFAULT_THEME
from .renderers.base import Renderer
from .renderers.pptx_renderer import PptxRenderer
from .renderers.docx_renderer import DocxRenderer
from .renderers.xlsx_renderer import XlsxRenderer


class DocumentService:
    """The one entry point. This is what your API route calls.

    Usage:
        spec = PptxSpec(**tool_call_json)   # raises on bad shape
        result = DocumentService(storage_dir).generate(spec)
    """

    _RENDERERS: dict[DocType, type[Renderer]] = {
        DocType.PPTX: PptxRenderer,
        DocType.DOCX: DocxRenderer,
        DocType.XLSX: XlsxRenderer,
    }

    def __init__(self, storage_dir: Path, theme: Theme = DEFAULT_THEME):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.theme = theme

    def generate(self, spec: DocumentSpec) -> DocumentResult:
        renderer_cls = self._RENDERERS[spec.doc_type]
        renderer = renderer_cls(self.theme)
        output_path = self._output_path(spec.title, spec.doc_type.value)
        return renderer.render(spec, output_path)

    def _output_path(self, title: str, ext: str) -> Path:
        # UUID instead of time.time() — no collisions under concurrency,
        # and it's a stable handle you can log against a request id.
        clean_title = re.sub(r"[^a-zA-Z0-9]", "_", title)[:24].strip("_") or "Deliverable"
        filename = f"{clean_title}_{uuid.uuid4().hex[:8]}.{ext}"
        return self.storage_dir / filename
