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

    def _register_default_tools(self):
        # 1. search_knowledge_base
        self.register_tool(
            name="search_knowledge_base",
            description="Searches indexed technical standards (ASME BPVC, API 510/570, GFR-2017) and plant manuals.",
            parameters={"type": "object", "properties": {"query": {"type": "string"}, "top_k": {"type": "integer", "default": 3}}, "required": ["query"]},
            func=self._search_kb_wrapper,
        )
        # 2. execute_python_code
        self.register_tool(
            name="execute_python_code",
            description="Executes a Python script in an isolated headless sandbox. All inputs must be supplied as variables in the code (NEVER use input() as it causes timeout errors). Script must include print(...) to output results.",
            parameters={"type": "object", "properties": {"code": {"type": "string", "description": "Complete Python script to execute with variables initialized in code (no interactive input() calls)"}}, "required": ["code"]},
            func=self._execute_code_wrapper,
        )
        # 3. generate_word_document
        self.register_tool(
            name="generate_word_document",
            description="Creates a professional Word document (.docx) from structured sections.",
            parameters={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "subject": {"type": "string"},
                    "sections": {"type": "array", "items": {"type": "object", "properties": {"heading": {"type": "string"}, "content": {"type": "string"}}, "required": ["heading", "content"]}},
                },
                "required": ["title", "sections"],
            },
            func=self._generate_word_wrapper,
        )
        # 5. generate_excel_spreadsheet
        self.register_tool(
            name="generate_excel_spreadsheet",
            description="Creates a formatted Excel spreadsheet (.xlsx) with dynamic table columns and calculation rows.",
            parameters={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "sheet_name": {"type": "string", "default": "Calculations"},
                    "headers": {"type": "array", "items": {"type": "string"}},
                    "rows": {"type": "array", "items": {"type": "array", "items": {}}},
                    "rules": {"type": "array", "items": {"type": "object", "properties": {"match_values": {"type": "array", "items": {"type": "string"}}, "color_hex": {"type": "string"}, "bold": {"type": "boolean"}}}},
                },
                "required": ["title", "headers", "rows"],
            },
            func=self._generate_excel_wrapper,
        )
        # 6. inspect_visual_attachment
        self.register_tool(
            name="inspect_visual_attachment",
            description="Inspects technical diagrams, P&IDs, blueprints, and images for dimensions and structure.",
            parameters={"type": "object", "properties": {"filename": {"type": "string"}}, "required": ["filename"]},
            func=self._inspect_vision_wrapper,
        )    