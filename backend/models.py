from typing import Any, Dict, List, Optional, Tuple, TypedDict
from pydantic import BaseModel, Field


class RoutingDecision(BaseModel):
    task_category: str
    selected_model_id: str
    model_name: str
    confidence: float = 0.95
    is_fallback: bool = False
    active_model: Optional[str] = None
    requested_model: Optional[str] = None
    fallback_message: Optional[str] = None


class ToolResult(BaseModel):
    tool_name: str
    success: bool
    output: Any
    error: Optional[str] = None
    deliverable_specs: List[Dict[str, Any]] = Field(default_factory=list)
    deliverables: List[Dict[str, Any]] = Field(default_factory=list)
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    duration_ms: int = 0


class LangGraphAgentState(TypedDict, total=False):
    task_id: str
    prompt: str
    attachments: List[Dict[str, Any]]
    history: List[Dict[str, str]]
    override_model: Optional[str]
    decision: Dict[str, Any]
    target_model: str
    active_model_tag: str
    is_fallback: bool
    system_prompt: str
    b64_images: List[str]
    scratchpad: str
    pending_action: Optional[Tuple[str, Dict[str, Any]]]
    last_tool_result: Optional[Dict[str, Any]]
    turn: int
    max_turns: int
    completed: bool
    final_answer: str
    steps: List[Dict[str, Any]]
    citations: List[Dict[str, Any]]
    observations_history: List[Dict[str, Any]]
    feedback_history: List[Dict[str, Any]]
    latest_feedback: str
    pending_deliverable_specs: List[Dict[str, Any]]
    deliverables: List[Dict[str, Any]]
    failures: int
    confidence_score: float
    confidence_metrics: Dict[str, Any]
    qa_gate_passed: bool
    requires_human_approval: bool
    approval_status: str
    start_time: float
    total_execution_ms: int
    audit_event: Dict[str, Any]


class TaskExecuteRequest(BaseModel):
    prompt: str
    override_model: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    history: Optional[List[Dict[str, str]]] = None


class ApprovalRequest(BaseModel):
    task_id: str
    supervisor_name: Optional[str] = "Lead Plant Inspection Engineer"
    decision_notes: Optional[str] = "Formally verified against statutory refinery codes. Approved."


class ModelSelectRequest(BaseModel):
    model_id: str
