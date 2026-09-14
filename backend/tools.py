import ast
import re
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from pydantic import BaseModel, Field

from .config import STORAGE_DIR
from .document_generator import (
    DocxSpec,
    PptxSpec,
    SectionSpec,
    SlideSpec,
    XlsxSpec,
    doc_service,
    py_executor,
    PySpec,
)
from .knowledge_base import knowledge_base
from .models import ToolResult
from .multimodal_vision import vision_engine
from .network_guard import sentinel

_UNSAFE_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


# -----------------------------------------------------------------------
# Filesystem safety helpers — every file-touching tool goes through these.
# -----------------------------------------------------------------------

def _sanitize_filename_component(raw: str, fallback: str, max_len: int = 80) -> str:
    """Reduces arbitrary model-supplied text to a safe filename fragment:
    lowercase, spaces to underscores, anything outside [A-Za-z0-9._-] stripped."""
    raw = (raw or "").strip().lower().replace(" ", "_")
    raw = _UNSAFE_FILENAME_CHARS.sub("", raw)
    raw = raw.strip("._-")
    return (raw or fallback)[:max_len]


def _resolve_within_storage(filename: str) -> Path:
    """Builds a path inside STORAGE_DIR and refuses to return anything that
    escapes it — including via an absolute-path override or via '..' traversal."""
    storage_root = STORAGE_DIR.resolve()
    candidate = (storage_root / filename).resolve()
    try:
        candidate.relative_to(storage_root)
    except ValueError:
        raise ValueError(f"Rejected path outside sandboxed storage: {filename!r}")
    return candidate


def _auto_print_last_expression(code: str) -> str:
    """If the code's last top-level statement is a bare expression and nothing
    already calls print(), wraps it in print() so sandboxed calculations produce visible output."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return code
    if not tree.body or "print(" in code:
        return code
    last = tree.body[-1]
    if isinstance(last, ast.Expr):
        lines = code.splitlines()
        start, end = last.lineno - 1, last.end_lineno
        expr_src = "\n".join(lines[start:end])
        return "\n".join(lines[:start] + [f"print({expr_src})"] + lines[end:])
    return code


def render_pending_deliverable(spec_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Renders a staged DeliverableSpec into a physical file on disk."""
    tool_name = spec_dict.get("tool_name", "")
    args = spec_dict.get("arguments", {})

    try:
        if tool_name == "generate_word_document":
            title = args.get("title", "Technical Report")
            subject = args.get("subject", "Industrial Asset Evaluation")
            sections = [
                SectionSpec(heading=s.get("heading", ""), content=s.get("content", ""))
                for s in args.get("sections", [])
            ]
            doc_spec = DocxSpec(title=title, subject=subject, sections=sections)
            res = doc_service.generate(doc_spec)
            paragraphs = [
                f"{s.get('heading', '')}: {s.get('content', '')}" if s.get("heading") else s.get("content", "")
                for s in args.get("sections", [])
            ] or [subject]

            return {
                "type": "document",
                "file_type": "docx",
                "filename": res.filename,
                "title": title,
                "subject": subject,
                "path": f"/api/artifacts/{res.filename}",
                "download_url": f"/api/documents/download/{res.filename}",
                "local_path": str(res.path),
                "format": "docx",
                "size_bytes": res.size_bytes,
                "sections": args.get("sections", []),
                "paragraphs": paragraphs,
            }

        elif tool_name == "generate_powerpoint_presentation":
            title = args.get("title", "Executive Presentation")
            subtitle = args.get("subtitle", "Industrial Evaluation")
            slides_input = args.get("slides", [])
            slides = [
                SlideSpec(
                    title=s.get("title", ""),
                    subtitle=s.get("subtitle"),
                    definition=s.get("definition"),
                    explanation=s.get("explanation"),
                    bullets=s.get("bullets", []),
                    notes=s.get("notes", ""),
                )
                for s in slides_input
            ]
            pptx_spec = PptxSpec(title=title, subtitle=subtitle, slides=slides)
            res = doc_service.generate(pptx_spec)

            preview_slides = [
                {
                    "title": s.get("title", "Technical Slide"),
                    "subtitle": s.get("subtitle", ""),
                    "definition": s.get("definition", ""),
                    "explanation": s.get("explanation", ""),
                    "bullets": s.get("bullets", []) if isinstance(s.get("bullets"), list) else [s.get("bullets")] if s.get("bullets") else ["Technical evaluation and operational standards."],
                }
                for s in slides_input
            ] or [{"title": title, "subtitle": subtitle, "bullets": [subtitle or "Industrial Evaluation"]}]

            return {
                "type": "presentation",
                "file_type": "pptx",
                "filename": res.filename,
                "title": title,
                "subtitle": subtitle,
                "path": f"/api/artifacts/{res.filename}",
                "download_url": f"/api/documents/download/{res.filename}",
                "local_path": str(res.path),
                "format": "pptx",
                "size_bytes": res.size_bytes,
                "slides": preview_slides,
            }

        elif tool_name == "generate_excel_spreadsheet":
            title = args.get("title", "Asset Workbook")
            headers = args.get("headers", [])
            rows = args.get("rows", [])
            xlsx_spec = XlsxSpec(title=title, headers=headers, rows=rows)
            res = doc_service.generate(xlsx_spec)
            return {
                "type": "spreadsheet",
                "file_type": "xlsx",
                "filename": res.filename,
                "title": title,
                "path": f"/api/artifacts/{res.filename}",
                "download_url": f"/api/documents/download/{res.filename}",
                "local_path": str(res.path),
                "format": "xlsx",
                "size_bytes": res.size_bytes,
                "headers": headers,
                "rows": rows,
            }

    except Exception as e:
        sentinel.record_audit_event(
            event_type="DELIVERABLE_RENDER_FAILED",
            severity="WARNING",
            details=f"Failed to render deliverable '{tool_name}': {e}",
            metadata={"tool_name": tool_name, "title": args.get("title", "")},
        )
        return None

    return None


class SovereignToolRegistry:
    """Registry managing execution and definitions of sovereign tools."""

    def __init__(self):
        self._tools: Dict[str, Callable[[Dict[str, Any]], ToolResult]] = {}
        self._definitions: List[ToolDefinition] = []
        self._register_builtins()

    def register(self, name: str, fn: Callable[[Dict[str, Any]], ToolResult], defn: Optional[ToolDefinition] = None):
        if name in self._tools:
            raise ValueError(f"Tool '{name}' is already registered — refusing silent overwrite.")
        self._tools[name] = fn
        if defn:
            self._definitions.append(defn)

    def get_definitions(self) -> List[ToolDefinition]:
        return list(self._definitions)

    def execute_tool(self, name: str, args: Dict[str, Any]) -> ToolResult:
        t0 = time.time()
        if name not in self._tools:
            return ToolResult(
                tool_name=name, success=False, output="",
                error=f"Tool '{name}' is not recognized in sovereign registry.", duration_ms=0,
            )
        try:
            res = self._tools[name](args)
            res.duration_ms = max(1, int((time.time() - t0) * 1000))
            return res
        except Exception as e:
            return ToolResult(
                tool_name=name, success=False, output="",
                error=f"Tool execution failed: {e}", duration_ms=max(1, int((time.time() - t0) * 1000)),
            )

    def _register_builtins(self):
        # 1. Knowledge Base Search
        def _search_kb(args: Dict[str, Any]) -> ToolResult:
            query = str(args.get("query", "")).strip()
            top_k = args.get("top_k", 3)
            try:
                top_k = max(1, min(10, int(top_k)))
            except (TypeError, ValueError):
                top_k = 3
            hits = knowledge_base.search(query=query, top_k=top_k)
            lines = [f"Found {len(hits)} relevant passage(s) in sovereign standards:"]
            citations = []
            for i, h in enumerate(hits, 1):
                lines.append(f"\n[{i}] {h['title']}:\n{h['excerpt']}")
                citations.append({
                    "doc_id": h.get("doc_id", "DOC"),
                    "title": h.get("title", "Standard"),
                    "filename": h.get("filename", "doc.txt"),
                    "chunk_index": i,
                    "total_chunks": len(hits),
                    "excerpt": h.get("excerpt", ""),
                    "full_content": h.get("full_content", ""),
                    "relevance_score": h.get("relevance_score", 0.9),
                })
            return ToolResult(tool_name="search_knowledge_base", success=True, output="\n".join(lines), citations=citations)

        # 2. Python Isolated Sandbox
        def _exec_py(args: Dict[str, Any]) -> ToolResult:
            raw_code = args.get("code", "")
            if not str(raw_code).strip():
                return ToolResult(tool_name="execute_python_code", success=False, output="", error="No Python code provided.")
            code = _auto_print_last_expression(raw_code)
            title = args.get("title", "calc_sim")
            safe_title = _sanitize_filename_component(title, fallback="calc_sim")

            spec = PySpec(title=title, code=code, timeout_seconds=20)
            try:
                target = _resolve_within_storage(f"{safe_title}_{int(time.time())}_{uuid.uuid4().hex[:8]}.py")
            except ValueError as e:
                return ToolResult(tool_name="execute_python_code", success=False, output="", error=str(e))

            deliv = py_executor.deliver(spec, target)
            exec_res = deliv.execution

            deliverables = []
            seen_plot_filenames = set()
            for p in exec_res.plots:
                plot_fn = p.get("filename", f"plot_{int(time.time())}.png") if isinstance(p, dict) else Path(p).name
                seen_plot_filenames.add(plot_fn)
                local_file = STORAGE_DIR / plot_fn
                sz = local_file.stat().st_size if local_file.exists() else 0
                deliverables.append({
                    "type": "plot", "file_type": "png", "filename": plot_fn,
                    "title": (p.get("title") if isinstance(p, dict) else None) or "Engineering Calculation Plot",
                    "path": f"/api/artifacts/{plot_fn}",
                    "download_url": f"/api/documents/download/{plot_fn}",
                    "local_path": str(local_file),
                    "format": "png", "size_bytes": sz,
                })
            for af in exec_res.artifact_files:
                af_path = Path(af)
                af_name = af_path.name
                if af_name not in seen_plot_filenames:
                    local_af = STORAGE_DIR / af_name
                    sz = local_af.stat().st_size if local_af.exists() else (af_path.stat().st_size if af_path.exists() else 0)
                    deliverables.append({
                        "type": "plot" if af_path.suffix.lower() == ".png" else "file",
                        "file_type": af_path.suffix.lstrip("."), "filename": af_name,
                        "title": "Generated Artifact",
                        "path": f"/api/artifacts/{af_name}",
                        "download_url": f"/api/documents/download/{af_name}",
                        "local_path": str(local_af if local_af.exists() else af_path),
                        "format": af_path.suffix.lstrip("."), "size_bytes": sz,
                    })
            if target.exists():
                deliverables.append({
                    "type": "code", "file_type": "py", "filename": target.name,
                    "title": "Simulation Python Script",
                    "path": f"/api/artifacts/{target.name}",
                    "download_url": f"/api/documents/download/{target.name}",
                    "local_path": str(target),
                    "format": "py", "size_bytes": target.stat().st_size,
                    "code": code,
                    "stdout": exec_res.stdout,
                    "stderr": exec_res.stderr,
                })

            out = f"Exit Code: {exec_res.exit_code}\nStdout:\n{exec_res.stdout}"
            if exec_res.stderr:
                out += f"\nStderr:\n{exec_res.stderr}"
            return ToolResult(
                tool_name="execute_python_code", success=exec_res.success, output=out,
                error=exec_res.stderr if not exec_res.success else None, deliverables=deliverables,
            )

        # 3. Document Deliverables (Word, PPTX, XLSX) — staged pending QA gate.
        def _stage_docx(args: Dict[str, Any]) -> ToolResult:
            sections = args.get("sections") or []
            if not sections:
                return ToolResult(tool_name="generate_word_document", success=False, output="", error="No sections provided.")
            title = args.get("title", "Technical Report")
            safe_title = _sanitize_filename_component(title, fallback="technical_report")
            filename = f"{safe_title}_{uuid.uuid4().hex[:8]}.docx"
            spec_info = {"tool_name": "generate_word_document", "arguments": args, "title": title, "type": "docx"}
            deliv = {
                "type": "document", "file_type": "docx", "filename": filename, "title": f"{title} (.docx)",
                "path": f"/api/artifacts/{filename}", "download_url": f"/api/documents/download/{filename}",
                "format": "Word Document (.docx)", "sections": sections, "size_bytes": 0,
            }
            return ToolResult(
                tool_name="generate_word_document", success=True,
                output=f"Word document specification '{title}' staged successfully for safety gate evaluation.",
                deliverable_specs=[spec_info], deliverables=[deliv],
            )

        def _stage_pptx(args: Dict[str, Any]) -> ToolResult:
            slides = args.get("slides") or []
            if not slides:
                return ToolResult(tool_name="generate_powerpoint_presentation", success=False, output="", error="No slides provided.")
            title = args.get("title", "Executive Presentation")
            subtitle = args.get("subtitle", "Industrial Evaluation")
            safe_title = _sanitize_filename_component(title, fallback="presentation")
            filename = f"{safe_title}_{uuid.uuid4().hex[:8]}.pptx"
            spec_info = {"tool_name": "generate_powerpoint_presentation", "arguments": args, "title": title, "type": "pptx"}
            deliv = {
                "type": "presentation", "file_type": "pptx", "filename": filename, "title": f"{title} (.pptx)",
                "subtitle": subtitle,
                "path": f"/api/artifacts/{filename}", "download_url": f"/api/documents/download/{filename}",
                "format": "PowerPoint Deck (.pptx)", "slides": slides, "size_bytes": 0,
            }
            return ToolResult(
                tool_name="generate_powerpoint_presentation", success=True,
                output=f"PowerPoint presentation specification '{title}' staged successfully for safety gate evaluation.",
                deliverable_specs=[spec_info], deliverables=[deliv],
            )

        def _stage_xlsx(args: Dict[str, Any]) -> ToolResult:
            headers = args.get("headers") or []
            rows = args.get("rows")
            if not headers or not rows:
                return ToolResult(tool_name="generate_excel_spreadsheet", success=False, output="", error="Headers and rows are required.")
            title = args.get("title", "Asset Calculation Sheet")
            safe_title = _sanitize_filename_component(title, fallback="workbook")
            filename = f"{safe_title}_{uuid.uuid4().hex[:8]}.xlsx"
            spec_info = {"tool_name": "generate_excel_spreadsheet", "arguments": args, "title": title, "type": "xlsx"}
            deliv = {
                "type": "spreadsheet", "file_type": "xlsx", "filename": filename, "title": f"{title} (.xlsx)",
                "path": f"/api/artifacts/{filename}", "download_url": f"/api/documents/download/{filename}",
                "headers": headers, "rows": rows, "format": "Excel Workbook (.xlsx)", "size_bytes": 0,
            }
            return ToolResult(
                tool_name="generate_excel_spreadsheet", success=True,
                output=f"Excel spreadsheet specification '{title}' staged successfully for safety gate evaluation.",
                deliverable_specs=[spec_info], deliverables=[deliv],
            )

        # 4. Multimodal Vision Inspection
        def _inspect_vision(args: Dict[str, Any]) -> ToolResult:
            raw_fn = str(args.get("filename", ""))
            fn_name = Path(raw_fn).name
            if not fn_name:
                return ToolResult(tool_name="inspect_visual_attachment", success=False, output="", error="No filename provided.")
            try:
                target_path = _resolve_within_storage(fn_name)
            except ValueError as e:
                return ToolResult(tool_name="inspect_visual_attachment", success=False, output="", error=str(e))
            if not target_path.exists():
                return ToolResult(tool_name="inspect_visual_attachment", success=False, output="", error=f"Visual attachment '{fn_name}' not found in storage.")
            info = vision_engine.inspect_image_file(target_path)
            return ToolResult(
                tool_name="inspect_visual_attachment", success=info.get("success", False),
                output=f"Visual Inspection of {fn_name}:\nMetadata: {info.get('image_info')}", error=info.get("error"),
            )

        self.register("search_knowledge_base", _search_kb,
            ToolDefinition(name="search_knowledge_base", description="Search indexed statutory standards using hybrid RAG.", parameters={"query": "string", "top_k": "integer"}))
        self.register("execute_python_code", _exec_py,
            ToolDefinition(name="execute_python_code", description="Execute engineering calculations in an isolated Python sandbox.", parameters={"code": "string"}))
        self.register("generate_word_document", _stage_docx,
            ToolDefinition(name="generate_word_document", description="Synthesize formal technical notes in Word (.docx).", parameters={"title": "string", "sections": "list"}))
        self.register("generate_powerpoint_presentation", _stage_pptx,
            ToolDefinition(
                name="generate_powerpoint_presentation",
                description="Generate professional, comprehensive slide decks (.pptx). Each slide must include clear definitions, in-depth technical explanations, and detailed points with bold headings, not just brief bullet points.",
                parameters={
                    "title": "string (Deck title)",
                    "subtitle": "string (optional Deck subtitle)",
                    "slides": "list of slide objects: [{title: string, subtitle?: string, definition?: string (statutory or technical definition), explanation?: string (detailed analysis and narrative explanation), bullets: list of detailed points with bold lead-ins, notes?: string (speaker notes)}]"
                }
            )
        )
        self.register("generate_excel_spreadsheet", _stage_xlsx,
            ToolDefinition(name="generate_excel_spreadsheet", description="Generate auditable engineering calculation sheets (.xlsx).", parameters={"title": "string", "headers": "list", "rows": "list"}))
        self.register("inspect_visual_attachment", _inspect_vision,
            ToolDefinition(name="inspect_visual_attachment", description="Inspect P&ID schematics and visual attachments.", parameters={"filename": "string"}))


tool_registry = SovereignToolRegistry()