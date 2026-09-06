# Abstract Base Renderer for Office Deliverables
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from ..schemas import DocumentSpec, DocumentResult
from ..theme import Theme


class Renderer(ABC):
    """One implementation per output format. This is the whole point:
    adding a new format means adding a new class here, never touching
    the other two."""

    def __init__(self, theme: Theme):
        self.theme = theme

    @abstractmethod
    def render(self, spec: DocumentSpec, output_path: Path) -> DocumentResult:
        ...
