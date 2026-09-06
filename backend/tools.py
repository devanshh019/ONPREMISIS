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

    def register_tool(self, name: str, description: str, parameters: Dict[str, Any], func: Callable):
        self._tools[name] = func
        self._definitions[name] = ToolDefinition(name=name, description=description, parameters=parameters)

    def get_definitions(self) -> List[ToolDefinition]:
        return list(self._definitions.values())

    def get_tool_prompt_description(self) -> str:
        lines = []
        for defn in self._definitions.values():
            lines.append(f"- **`{defn.name}`**: {defn.description}\n  Schema: `{json.dumps(defn.parameters)}`")
        return "\n".join(lines)

    def execute_tool(self, name: str, arguments: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        if name not in self._tools:
            return ToolResult(
                tool_name=name,
                success=False,
                output=f"Error: Tool '{name}' not found. Available: {list(self._tools.keys())}",
                error=f"Unknown tool: {name}",
                duration_ms=int((time.time() - start_time) * 1000),
            )
        try:
            handler = self._tools[name]
            result = handler(**arguments)
            elapsed_ms = int((time.time() - start_time) * 1000)
            if isinstance(result, ToolResult):
                result.duration_ms = elapsed_ms
                return result
            return ToolResult(tool_name=name, success=True, output=result, duration_ms=elapsed_ms)
        except Exception as e:
            return ToolResult(
                tool_name=name,
                success=False,
                output=f"Execution error in tool '{name}': {str(e)}",
                error=str(e),
                duration_ms=int((time.time() - start_time) * 1000),
            )
    