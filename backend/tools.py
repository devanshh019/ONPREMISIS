# Sovereign Tool Registry and Dynamic ReAct Tool Handlers
import re
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from pydantic import BaseModel, Field

from .knowledge_base import knowledge_base
from .document_generator import doc_service, py_executor, DocxSpec, PptxSpec, XlsxSpec, PySpec, CodeDeliverable, CellRule, SectionSpec, SlideSpec
from .multimodal_vision import vision_engine


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]


class ToolResult(BaseModel):
    tool_name: str
    success: bool
    output: Any
    error: Optional[str] = None
    deliverables: List[Dict[str, Any]] = Field(default_factory=list)
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    duration_ms: int = 0


class ToolRegistry:

    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._definitions: Dict[str, ToolDefinition] = {}
        self._register_default_tools()