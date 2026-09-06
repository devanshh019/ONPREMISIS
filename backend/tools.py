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
        # 4. generate ppt
        self.register_tool(
            name="generate_powerpoint_presentation",
            description="Creates a 16:9 widescreen PowerPoint presentation deck (.pptx) from structured slide data.",
            parameters={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "subtitle": {"type": "string"},
                    "slides": {"type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "bullets": {"type": "array", "items": {"type": "string"}}}, "required": ["title", "bullets"]}},
                },
                "required": ["title", "slides"],
            },
            func=self._generate_powerpoint_wrapper,
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

    def _search_kb_wrapper(self, query: str = "", top_k: int = 3, **kwargs) -> ToolResult:
        search_query = query or kwargs.get("text") or kwargs.get("q") or "engineering standard"
        citations = knowledge_base.search(search_query, top_k=top_k)
        if not citations:
            return ToolResult(tool_name="search_knowledge_base", success=True, output=f"No matches for query '{search_query}'.", citations=[])
        snippets = [f"[{i}] Standard: '{c['title']}':\n{c['full_content']}" for i, c in enumerate(citations, 1)]
        return ToolResult(tool_name="search_knowledge_base", success=True, output="\n\n".join(snippets), citations=citations)

    def _execute_code_wrapper(self, code: str = "", **kwargs) -> ToolResult:
        py_code = code or kwargs.get("script") or kwargs.get("python_code") or ""
        if not py_code.strip():
            return ToolResult(tool_name="execute_python_code", success=False, output="Error: Empty Python code provided. You must supply the complete script in the 'code' parameter, e.g. Action Input: {\"code\": \"def solution(): ...\\nprint(solution())\"}", error="Empty code")

        title = kwargs.get("title") or "agent_calc"
        timeout = int(kwargs.get("timeout_seconds") or 15)
        spec = PySpec(title=title, code=py_code, timeout_seconds=timeout)

        from .config import STORAGE_DIR
        timestamp = int(time.time() * 1000)
        output_script_name = f"agent_calc_{timestamp}.py"
        output_path = Path(STORAGE_DIR) / output_script_name

        from .document_generator import py_executor
        code_deliverable = py_executor.deliver(spec, output_path)
        exec_res = code_deliverable.execution

        deliverables = []
        for p in exec_res.plots:
            deliverables.append({
                "type": "plot",
                "file_type": "png",
                "filename": p["filename"],
                "path": p["path"],
                "title": p.get("title") or "Generated Plot",
                "format": "PNG Image",
            })

        if code_deliverable.path:
            deliverables.append({
                "type": "code",
                "file_type": "py",
                "filename": code_deliverable.filename,
                "path": f"/api/artifacts/{code_deliverable.filename}",
                "title": "Executed Python Simulation",
                "format": "Python Script",
                "code": py_code,
                "stdout": exec_res.stdout,
                "stderr": exec_res.stderr,
            })

        out = f"Exit Code: {exec_res.exit_code}\nStdout:\n{exec_res.stdout or '(none)'}"
        if exec_res.stderr:
            out += f"\nStderr:\n{exec_res.stderr}"

        return ToolResult(
            tool_name="execute_python_code",
            success=exec_res.success,
            output=out,
            error=exec_res.stderr if not exec_res.success else None,
            deliverables=deliverables,
            duration_ms=exec_res.duration_ms,
        )

    def _generate_word_wrapper(self, title: str = "Technical Evaluation Note", sections: Optional[List[Any]] = None, subject: Optional[str] = None, **kwargs) -> ToolResult:
        doc_title = title or kwargs.get("name") or kwargs.get("document_title") or "Technical Evaluation Note"
        doc_subject = subject or kwargs.get("topic") or kwargs.get("summary")

        # Flexible section extraction from various aliases
        raw_sections = sections or kwargs.get("paragraphs") or kwargs.get("content") or kwargs.get("body") or kwargs.get("data")
        clean_sections: List[SectionSpec] = []

        if isinstance(raw_sections, list):
            for i, s in enumerate(raw_sections):
                if isinstance(s, dict):
                    clean_sections.append(SectionSpec(heading=s.get("heading") or s.get("title") or f"Section {i+1}", content=str(s.get("content") or s.get("text") or s.get("body") or "")))
                elif isinstance(s, str):
                    clean_sections.append(SectionSpec(heading=f"Section {i+1}: Directive", content=s))
        elif isinstance(raw_sections, str):
            clean_sections = [SectionSpec(heading="Executive Summary & Directive", content=raw_sections)]
        else:
            clean_sections = [SectionSpec(heading="Executive Summary", content="Technical assessment and turnaround parameters recorded.")]

        spec = DocxSpec(title=doc_title, subject=doc_subject, sections=clean_sections)
        res = doc_service.generate(spec)
        paragraphs = [f"**{s.heading}**\n{s.content}" for s in spec.sections]
        deliverable = {
            "type": "document", "file_type": "docx", "filename": res.filename, "path": f"/api/artifacts/{res.filename}",
            "title": f"{spec.title} (.docx)", "subject": spec.subject, "paragraphs": paragraphs,
            "sections": [s.model_dump() for s in spec.sections], "format": "Word Document (.docx)", "size_bytes": res.size_bytes
        }
        return ToolResult(tool_name="generate_word_document", success=True, output=f"Generated Word document '{res.filename}' ({res.size_bytes} bytes).", deliverables=[deliverable])

    def _generate_powerpoint_wrapper(self, title: str = "Technical Assessment Brief", slides: Optional[List[Any]] = None, subtitle: Optional[str] = None, **kwargs) -> ToolResult:
        ppt_title = title or kwargs.get("name") or kwargs.get("deck_title") or "Technical Assessment Brief"
        ppt_sub = subtitle or kwargs.get("sub_title") or kwargs.get("description")

        raw_slides = slides or kwargs.get("pages") or kwargs.get("content") or kwargs.get("items")
        clean_slides: List[SlideSpec] = []

        if isinstance(raw_slides, list):
            for i, s in enumerate(raw_slides):
                if isinstance(s, dict):
                    stitle = s.get("title") or s.get("heading") or f"Slide {i+1}"
                    bullets = s.get("bullets") or s.get("points") or s.get("content") or []
                    if isinstance(bullets, str):
                        bullets = [bullets]
                    clean_slides.append(SlideSpec(title=stitle, bullets=[str(b) for b in bullets]))
                elif isinstance(s, str):
                    clean_slides.append(SlideSpec(title=f"Overview {i+1}", bullets=[s]))
        else:
            clean_slides = [SlideSpec(title="Overview", bullets=["Evaluation Complete"])]

        spec = PptxSpec(title=ppt_title, subtitle=ppt_sub, slides=clean_slides)
        res = doc_service.generate(spec)
        deliverable = {
            "type": "presentation", "file_type": "pptx", "filename": res.filename, "path": f"/api/artifacts/{res.filename}",
            "title": f"{spec.title} (.pptx)", "subtitle": spec.subtitle or "Engineering Assessment", "slides": [s.model_dump() for s in spec.slides],
            "format": "PowerPoint Deck (.pptx)", "size_bytes": res.size_bytes
        }
        return ToolResult(tool_name="generate_powerpoint_presentation", success=True, output=f"Generated PowerPoint deck '{res.filename}' ({res.size_bytes} bytes).", deliverables=[deliverable])

    def _generate_excel_wrapper(self, title: str = "Engineering Calculation Sheet", headers: Optional[List[str]] = None, rows: Optional[List[List[Any]]] = None, sheet_name: str = "Calculations", rules: Optional[List[Dict[str, Any]]] = None, **kwargs) -> ToolResult:
        xl_title = title or kwargs.get("name") or "Engineering Calculation Sheet"
        xl_headers = headers or kwargs.get("columns") or kwargs.get("keys") or ["Parameter", "Calculated Value", "Unit", "Status"]
        xl_rows = rows or kwargs.get("data") or kwargs.get("items") or kwargs.get("table") or []

        default_rules = [
            CellRule(match_values=["VERIFIED", "ACCEPTABLE", "PASS", "COMPLIANT"], color_hex="16A34A", bold=True),
            CellRule(match_values=["FLAGGED", "NON-COMPLIANT", "FAIL", "CRITICAL", "ALERT"], color_hex="DC2626", bold=True),
        ]
        cell_rules = [CellRule(**r) for r in rules] if rules else default_rules
        spec = XlsxSpec(title=xl_title, sheet_name=sheet_name, headers=xl_headers, rows=xl_rows, rules=cell_rules)
        res = doc_service.generate(spec)
        deliverable = {
            "type": "spreadsheet", "file_type": "xlsx", "filename": res.filename, "path": f"/api/artifacts/{res.filename}",
            "title": f"{spec.title} (.xlsx)", "headers": spec.headers, "rows": spec.rows,
            "format": "Excel Workbook (.xlsx)", "size_bytes": res.size_bytes
        }
        return ToolResult(tool_name="generate_excel_spreadsheet", success=True, output=f"Generated Excel workbook '{res.filename}' ({res.size_bytes} bytes).", deliverables=[deliverable])

    def _inspect_vision_wrapper(self, filename: str = "", **kwargs) -> ToolResult:
        fname = filename or kwargs.get("path") or kwargs.get("name") or ""
        info = vision_engine.inspect_image_file(fname)
        if info.get("success"):
            img = info.get("image_info", {})
            return ToolResult(tool_name="inspect_visual_attachment", success=True, output=f"Image {fname}: {img.get('width')}x{img.get('height')}, {img.get('format')}")
        return ToolResult(tool_name="inspect_visual_attachment", success=False, output=f"Could not inspect {fname}: {info.get('error')}", error=info.get("error"))


tool_registry = ToolRegistry()


  