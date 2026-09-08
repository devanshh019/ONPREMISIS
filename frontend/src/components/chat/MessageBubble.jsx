import { useState } from 'react';
import {
  Bot, User, Lock, Terminal, Download, Eye, FileText,
  ChevronDown, ChevronRight, Cpu, BookOpen, Code2, AlertCircle,
  CheckCircle2, ShieldCheck, Workflow, RotateCcw, Sparkles
} from 'lucide-react';
import FormattedMarkdown from './FormattedMarkdown';
import { getArtifactIcon } from '../../utils/helpers';

export default function MessageBubble({
  msg,
  selectedDeliverable,
  onSelectDeliverable,
  onExpandImage,
  onSupervisorApproval,
}) {
  const [expandedTraces, setExpandedTraces] = useState({});
  const [expandedSteps, setExpandedSteps] = useState({});
  const [traceFilters, setTraceFilters] = useState({});

  const toggleTrace = (msgId) => {
    setExpandedTraces(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleStep = (msgId, stepNum) => {
    const key = `${msgId}-${stepNum}`;
    setExpandedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isTraceExpanded = expandedTraces[msg.id] || false;

  const getPhaseMeta = (phase, title = '') => {
    const p = phase || (
      title.includes('Observation') ? 'OBSERVATION' :
      title.includes('Feedback') ? 'FEEDBACK_LOOP' :
      title.includes('Reasoning') || title.includes('Thought') ? 'THOUGHT' :
      title.includes('Action') || title.includes('Tool') ? 'ACTION' :
      title.includes('Safety Gate') || title.includes('Confidence Gate') || title.includes('QA') ? 'QA_GATE' :
      title.includes('Audit') ? 'AUDIT' :
      title.includes('Intent') || title.includes('Ingestion') ? 'INTAKE' : 'PHASE'
    );
    switch (p) {
      case 'INTAKE':
        return { label: 'INTAKE ROUTER', badgeClass: 'bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]', dotColor: 'bg-[#6366f1]' };
      case 'THOUGHT':
        return { label: 'REASONING (THOUGHT)', badgeClass: 'bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]', dotColor: 'bg-[#8b5cf6]' };
      case 'ACTION':
        return { label: 'TOOL DISPATCH (ACTION)', badgeClass: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]', dotColor: 'bg-[#ea580c]' };
      case 'OBSERVATION':
        return { label: 'OBSERVATION (TOOL OUTPUT)', badgeClass: 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]', dotColor: 'bg-[#10b981]' };
      case 'FEEDBACK_LOOP':
        return { label: 'FEEDBACK LOOP & CRITIQUE', badgeClass: 'bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]', dotColor: 'bg-[#0284c7]' };
      case 'QA_GATE':
        return { label: 'QA SAFETY GATE', badgeClass: 'bg-[#fdf2f8] text-[#be185d] border-[#fbcfe8]', dotColor: 'bg-[#ec4899]' };
      case 'AUDIT':
        return { label: 'AIR-GAP AUDIT', badgeClass: 'bg-[#f8fafc] text-[#334155] border-[#e2e8f0]', dotColor: 'bg-[#64748b]' };
      default:
        return { label: 'REASONING STEP', badgeClass: 'bg-[#f4efe6] text-[#78716c] border-[#e5ded1]', dotColor: 'bg-[#ea580c]' };
    }
  };

  return (
    <div
      className={`flex space-x-3 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-6 h-6 rounded-md bg-[#ea580c] flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}

      <div
        className={`flex flex-col space-y-3 max-w-[90%] ${msg.role === 'user'
          ? 'bg-[#ede7dc] border border-[#d6cebf] text-[#1c1917] rounded-2xl rounded-tr-sm p-4 text-xs leading-relaxed shadow-sm'
          : 'bg-[#ffffff] border border-[#e5ded1] text-[#1c1917] rounded-2xl rounded-tl-sm p-5 shadow-sm space-y-3 text-xs leading-relaxed'
        }`}
      >
        {/* Assistant Meta - Model Auto-Selection Badge, QA Gate Badge, & Fallback Banner */}
        {msg.role === 'assistant' && (msg.routing || msg.confidence_score !== undefined || msg.confidence_percent !== undefined) && (
          <div className="space-y-2 pb-2.5 mb-1 border-b border-[#f0eae0]">
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded border font-bold text-[10px] flex items-center space-x-1 shadow-2xs ${
                  msg.fallback?.is_fallback || msg.is_fallback
                    ? 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]'
                    : 'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]'
                }`}>
                  <Cpu className="w-3 h-3" />
                  <span>MODEL: {msg.active_model || msg.routing?.model_name || 'Qwen 2.5 3B'}</span>
                </span>
                {msg.routing?.task_category && (
                  <span className="px-1.5 py-0.5 rounded bg-[#f4efe6] text-[#78716c] border border-[#e5ded1] text-[10px] font-semibold">
                    {msg.routing.task_category}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] text-[10px] font-semibold flex items-center space-x-1">
                  <span>LangGraph ReAct</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center space-x-1 shadow-2xs ${
                    (msg.confidence_percent || (msg.confidence_score ? Math.round(msg.confidence_score * 100) : 85)) >= 85
                      ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                      : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                  }`}
                  title={(msg.confidence_percent || 85) >= 85 ? 'Autonomous safety verification: Passed' : 'Safety review required: Requires Human Supervisor Sign-off'}
                >
                  {(msg.confidence_percent || (msg.confidence_score ? Math.round(msg.confidence_score * 100) : 85)) >= 85 ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                      <span>QA GATE: PASS</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-[#d97706]" />
                      <span>QA GATE: REVIEW</span>
                    </>
                  )}
                </span>
              </div>
              {msg.elapsed_seconds && (
                <span className="text-[10px] text-[#78716c] bg-[#faf8f5] px-2 py-0.5 rounded border border-[#e5ded1]">
                  Executed in {msg.elapsed_seconds}s
                </span>
              )}
            </div>

            {/* Explicit Fallback Notification Banner */}
            {(msg.fallback?.is_fallback || msg.is_fallback) && (
              <div className="p-2.5 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412] text-[11px] font-medium flex items-start space-x-2 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-[#ea580c] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Fallback Model Active:</strong> Model <code className="px-1.5 py-0.5 rounded bg-[#f4efe6] border border-[#e5ded1] font-mono text-[10px] text-[#ea580c] font-bold">{msg.fallback?.requested_model || msg.requested_model || msg.routing?.selected_model_id}</code> was not available in local Ollama; currently executing on fallback model <code className="px-1.5 py-0.5 rounded bg-[#f4efe6] border border-[#e5ded1] font-mono text-[10px] text-[#ea580c] font-bold">{msg.fallback?.active_model || msg.active_model}</code>.
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Uploaded Attachments (Photos & Documents) */}
        {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {msg.attachments.map((att, aIdx) => {
              const isImg =
                (att.file_type && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(att.file_type.toLowerCase())) ||
                (att.filename && att.filename.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i));
              return isImg ? (
                <div
                  key={aIdx}
                  onClick={() => onExpandImage && onExpandImage(att.path)}
                  className="group relative cursor-pointer rounded-xl border border-[#d6cebf] bg-[#ffffff] p-1.5 shadow-xs hover:border-[#ea580c] transition-all max-w-[200px]"
                  title="Click to inspect full image"
                >
                  <img src={att.path} alt={att.filename} className="rounded-lg max-h-40 w-auto object-contain bg-[#faf8f5]" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-mono text-[#78716c] truncate px-1 pt-1">{att.filename}</div>
                </div>
              ) : (
                <div
                  key={aIdx}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d6cebf] shadow-xs text-xs font-mono text-[#1c1917]"
                >
                  <FileText className="w-4 h-4 text-[#ea580c] shrink-0" />
                  <div className="truncate max-w-[180px]">
                    <div className="font-semibold truncate">{att.filename}</div>
                    <div className="text-[9px] text-[#78716c]">
                      {att.size_bytes ? `${Math.round(att.size_bytes / 1024)} KB` : 'Document'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message Content */}
        {msg.content && <FormattedMarkdown content={msg.content} />}

        {/* Sandbox Execution Result */}
        {msg.sandbox_output && (
          <div className="my-2.5 rounded-lg border border-[#e5ded1] bg-[#faf8f5] overflow-hidden shadow-xs">
            <div className="px-3 py-1.5 bg-[#f4efe6] border-b border-[#e5ded1] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="text-[11px] font-semibold text-[#1c1917]">Python Sandbox Execution Output</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffffff] text-[#16a34a] border border-[#d6cebf] font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse"></span>
                <span>Verified ({msg.sandbox_output.elapsed_seconds}s)</span>
              </span>
            </div>
            <div className="p-3 space-y-2 text-[11px] font-mono">
              {msg.sandbox_output.code && (
                <div>
                  <div className="text-[10px] uppercase text-[#78716c] font-semibold mb-1">Executed Code:</div>
                  <div className="p-2 rounded bg-[#ffffff] border border-[#e5ded1] text-[#1c1917] overflow-x-auto whitespace-pre">
                    {msg.sandbox_output.code}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase text-[#78716c] font-semibold mb-1">Live Terminal Output:</div>
                <div className="p-2.5 rounded bg-[#1c1917] text-[#f4efe6] overflow-x-auto whitespace-pre font-mono font-medium shadow-inner">
                  {msg.sandbox_output.stdout ? msg.sandbox_output.stdout.trim() : '(Process executed with 0 stdout output)'}
                </div>
              </div>
              {msg.sandbox_output.plots && msg.sandbox_output.plots.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-[#78716c] font-semibold mb-1">Generated Visualizations:</div>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.sandbox_output.plots.map((plot, pIdx) => {
                      const plotSrc = plot.path && plot.path.startsWith('/api/')
                        ? plot.path
                        : (plot.filename ? `/api/artifacts/${plot.filename}` : plot.path);
                      return (
                        <div
                          key={pIdx}
                          onClick={() => onSelectDeliverable && onSelectDeliverable(plot)}
                          className="p-2 rounded bg-[#ffffff] border border-[#e5ded1] cursor-pointer hover:border-[#ea580c] transition-all"
                        >
                          <img
                            src={plotSrc}
                            alt={plot.title}
                            className="rounded w-full object-contain max-h-56"
                            onError={(e) => {
                              if (plot.filename && !e.target.src.includes(`/api/artifacts/${plot.filename}`)) {
                                e.target.src = `/api/artifacts/${plot.filename}`;
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution Trace (LangGraph ReAct) */}
        {msg.steps && msg.steps.length > 0 && (() => {
          const currentFilter = traceFilters[msg.id] || 'ALL';
          const observationsCount = msg.steps.filter(s => s.phase === 'OBSERVATION' || s.title?.includes('Observation')).length;
          const feedbacksCount = msg.steps.filter(s => s.phase === 'FEEDBACK_LOOP' || s.title?.includes('Feedback')).length;
          const thoughtsActionsCount = msg.steps.filter(s => ['THOUGHT', 'ACTION'].includes(s.phase) || s.title?.includes('Reasoning') || s.title?.includes('Action')).length;

          const filteredSteps = msg.steps.filter(st => {
            if (currentFilter === 'OBSERVATION') return st.phase === 'OBSERVATION' || st.title?.includes('Observation');
            if (currentFilter === 'FEEDBACK') return st.phase === 'FEEDBACK_LOOP' || st.title?.includes('Feedback');
            if (currentFilter === 'THOUGHT_ACTION') return ['THOUGHT', 'ACTION'].includes(st.phase) || st.title?.includes('Reasoning') || st.title?.includes('Action');
            return true;
          });

          return (
            <div className="pt-1">
              <button
                onClick={() => toggleTrace(msg.id)}
                className="w-fit flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#f4efe6] hover:bg-[#ede7dc] border border-[#e5ded1] text-[11px] font-mono text-[#78716c] hover:text-[#1c1917] transition-all group cursor-pointer"
              >
                <Workflow className="w-3.5 h-3.5 text-[#ea580c] group-hover:scale-110 transition-transform" />
                <span className="font-semibold">LangGraph ReAct Trace ({msg.steps.length} Phases)</span>
                {isTraceExpanded ? (
                  <ChevronDown className="w-3 h-3 text-[#78716c]" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[#78716c]" />
                )}
              </button>

              {isTraceExpanded && (
                <div className="mt-2 space-y-2.5 p-2.5 rounded-lg bg-[#faf8f5] border border-[#e5ded1]">
                  {/* LangGraph StateGraph Node Pipeline Topology */}
                  <div className="p-2.5 rounded-lg bg-[#ffffff] border border-[#e5ded1] text-[10px] font-mono space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-[#78716c] font-semibold border-b border-[#f0eae0] pb-1.5">
                      <div className="flex items-center space-x-1.5 text-[#ea580c]">
                        <Workflow className="w-3 h-3" />
                        <span>LangGraph StateGraph Active Pipeline</span>
                      </div>
                      <span className="text-[9px] text-[#15803d] bg-[#f0fdf4] px-1.5 py-0.5 rounded border border-[#bbf7d0] font-bold">
                        CLOSED-LOOP REACT
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                      <span className="px-1.5 py-0.5 rounded bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] font-semibold">1. Intake</span>
                      <span className="text-[#a8a29e]">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe] font-semibold">2. Planner (Thought)</span>
                      <span className="text-[#a8a29e]">⇄</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] font-semibold">3. Tool Action</span>
                      <span className="text-[#a8a29e]">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] font-semibold">4. Observation</span>
                      <span className="text-[#a8a29e]">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] font-semibold">5. Feedback Loop</span>
                      <span className="text-[#a8a29e]">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#fdf2f8] text-[#be185d] border border-[#fbcfe8] font-semibold">6. QA Gate</span>
                      <span className="text-[#a8a29e]">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#f8fafc] text-[#334155] border border-[#e2e8f0] font-semibold">7. Audit</span>
                    </div>
                  </div>

                  {/* Trace Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setTraceFilters(prev => ({ ...prev, [msg.id]: 'ALL' }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer ${
                        currentFilter === 'ALL'
                          ? 'bg-[#ea580c] text-white shadow-2xs'
                          : 'bg-[#ffffff] text-[#78716c] hover:bg-[#f4efe6] border border-[#e5ded1]'
                      }`}
                    >
                      All Steps ({msg.steps.length})
                    </button>
                    {observationsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setTraceFilters(prev => ({ ...prev, [msg.id]: 'OBSERVATION' }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                          currentFilter === 'OBSERVATION'
                            ? 'bg-[#059669] text-white shadow-2xs'
                            : 'bg-[#ecfdf5] text-[#047857] hover:bg-[#d1fae5] border border-[#a7f3d0]'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Observations ({observationsCount})</span>
                      </button>
                    )}
                    {feedbacksCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setTraceFilters(prev => ({ ...prev, [msg.id]: 'FEEDBACK' }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                          currentFilter === 'FEEDBACK'
                            ? 'bg-[#0284c7] text-white shadow-2xs'
                            : 'bg-[#f0f9ff] text-[#0369a1] hover:bg-[#e0f2fe] border border-[#bae6fd]'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Feedback Loops ({feedbacksCount})</span>
                      </button>
                    )}
                    {thoughtsActionsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setTraceFilters(prev => ({ ...prev, [msg.id]: 'THOUGHT_ACTION' }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                          currentFilter === 'THOUGHT_ACTION'
                            ? 'bg-[#7c3aed] text-white shadow-2xs'
                            : 'bg-[#f5f3ff] text-[#6d28d9] hover:bg-[#ede9fe] border border-[#ddd6fe]'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Reasoning & Actions ({thoughtsActionsCount})</span>
                      </button>
                    )}
                  </div>

                  {/* Step Cards */}
                  <div className="space-y-1.5">
                    {filteredSteps.map((st, stIdx) => {
                      const stepNum = st.step_number || st.step_id || (stIdx + 1);
                      const stepKey = `${msg.id}-${stepNum}`;
                      const isStepExpanded = !!expandedSteps[stepKey];
                      const meta = getPhaseMeta(st.phase, st.title);

                      return (
                        <div
                          key={stepNum}
                          className="rounded-lg border border-[#e5ded1] bg-[#ffffff] overflow-hidden text-xs shadow-2xs"
                        >
                          <button
                            onClick={() => toggleStep(msg.id, stepNum)}
                            className="w-full flex items-center justify-between p-2.5 hover:bg-[#f4efe6] text-left font-mono text-[11px] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <div className={`w-2 h-2 rounded-full ${meta.dotColor} shrink-0`} />
                              <span className="font-semibold text-[#1c1917] truncate">
                                Phase {stepNum}: {st.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[#78716c] shrink-0">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${meta.badgeClass}`}>
                                {meta.label}
                              </span>
                              <span className="text-[10px] bg-[#f4efe6] px-1.5 py-0.5 rounded border border-[#e5ded1]">{st.duration_ms}ms</span>
                              {isStepExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#ea580c]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-[#78716c]" />
                              )}
                            </div>
                          </button>

                          {isStepExpanded && (
                            <div className="p-3 border-t border-[#e5ded1] bg-[#faf8f5] space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[#78716c] uppercase font-bold">Execution Status:</span>
                                  <span className={`px-2 py-0.5 rounded font-bold ${
                                    st.status === 'COMPLETED'
                                      ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]'
                                      : 'bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]'
                                  }`}>
                                    {st.status}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded border font-semibold ${meta.badgeClass}`}>
                                  Phase: {meta.label}
                                </span>
                              </div>

                              {st.details && (
                                <div className="bg-[#ffffff] p-3 rounded-md border border-[#e5ded1] font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#1c1917] shadow-xs">
                                  {st.details}
                                </div>
                              )}

                              {/* Direct Deliverables Link inside Observation */}
                              {st.data?.deliverables && st.data.deliverables.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] space-y-1 text-[11px]">
                                  <span className="text-[#166534] font-bold text-[10px] flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />
                                    <span>Observation Artifacts Produced:</span>
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {st.data.deliverables.map((d, dIdx) => (
                                      <button
                                        key={dIdx}
                                        type="button"
                                        onClick={() => onSelectDeliverable && onSelectDeliverable(d)}
                                        className="px-2 py-1 rounded bg-[#ffffff] border border-[#bbf7d0] text-[10px] font-mono text-[#15803d] hover:bg-[#dcfce7] flex items-center space-x-1 cursor-pointer shadow-2xs"
                                      >
                                        <Eye className="w-3 h-3 text-[#16a34a]" />
                                        <span>{d.filename || d.title}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Working Memory Scratchpad */}
                  {msg.scratchpad && (
                    <div className="mt-2 rounded-lg border border-[#fed7aa] bg-[#fffaf5] p-3 text-xs">
                      <div className="flex items-center space-x-1.5 text-[10px] font-mono text-[#ea580c] font-bold uppercase tracking-wider mb-2">
                        <Code2 className="w-3.5 h-3.5 text-[#ea580c]" />
                        <span>LangGraph Working Memory & ReAct Feedback Stream</span>
                      </div>
                      <div className="p-3 bg-[#ffffff] rounded-md border border-[#fed7aa] font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[#1c1917] max-h-72 overflow-y-auto">
                        {msg.scratchpad}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Knowledge Base Retrieved Sources */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-[#78716c] uppercase tracking-wider font-semibold mb-1.5">
              <BookOpen className="w-3 h-3 text-[#ea580c]" />
              <span>Knowledge Base Documents Retrieved ({Array.from(new Set(msg.citations.map(c => c.filename || c.title))).length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(msg.citations.map(c => JSON.stringify({ title: c.title, filename: c.filename })))).map((raw, cIdx) => {
                const doc = JSON.parse(raw);
                return (
                  <div
                    key={cIdx}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#faf8f5] border border-[#e5ded1] text-[11px] font-mono shadow-2xs hover:border-[#ea580c] transition-colors"
                    title={`Retrieved source: ${doc.title} (${doc.filename})`}
                  >
                    <FileText className="w-3 h-3 text-[#ea580c]" />
                    <span className="font-medium text-[#1c1917]">{doc.title}</span>
                    <span className="text-[#a8a29e] text-[10px]">[{doc.filename}]</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Generated Deliverables Cards */}
        {msg.artifacts && msg.artifacts.length > 0 && (
          <div className="pt-3 border-t border-[#f0eae0]">
            <div className="text-[10px] uppercase tracking-wider text-[#ea580c] font-bold mb-2 flex items-center space-x-1.5">
              <Download className="w-3 h-3" />
              <span>Generated Deliverables ({msg.artifacts.length}) • Click Card to Preview on Right</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {msg.artifacts.map((art, aIdx) => (
                <div
                  key={aIdx}
                  onClick={() => onSelectDeliverable && onSelectDeliverable(art)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all group ${
                    selectedDeliverable?.filename === art.filename
                      ? 'border-[#ea580c] bg-[#fff7ed] shadow-xs ring-1 ring-[#ea580c]'
                      : 'border-[#e5ded1] bg-[#faf8f5] hover:border-[#ea580c] hover:bg-[#ffffff]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate mr-2">
                    <div className="p-1.5 rounded bg-[#ffffff] border border-[#d6cebf] shrink-0 group-hover:scale-105 transition-transform">
                      {getArtifactIcon(art.file_type)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#1c1917] truncate group-hover:text-[#ea580c] transition-colors">{art.title}</div>
                      <div className="text-[10px] font-mono text-[#78716c] truncate">{art.filename}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button className="p-1.5 rounded text-[#78716c] hover:text-[#ea580c] transition-colors" title="View on right panel">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={art.download_url && art.download_url.startsWith('/api/') ? art.download_url : (art.path && art.path.startsWith('/api/') ? art.path : (art.filename ? `/api/documents/download/${art.filename}` : art.path))}
                      download={art.filename}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 text-[11px] font-medium rounded bg-[#ffffff] text-[#1c1917] hover:bg-[#ea580c] hover:text-white border border-[#d6cebf] transition-all shrink-0 flex items-center space-x-1 shadow-xs"
                      title="Direct download"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security / Sovereign Proof */}
        {msg.sovereign_proof && (
          <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-[#78716c] border-t border-[#f0eae0]">
            <span className="text-[#57534e] flex items-center">
              <Lock className="w-3 h-3 mr-1 text-[#ea580c]" />
              100% Air-Gapped (0 Bytes Exfiltrated)
            </span>
            <span className="truncate max-w-[160px] text-[#a8a29e]">
              {msg.sovereign_proof.audit_hash ? msg.sovereign_proof.audit_hash.slice(0, 16) + '...' : 'SOVEREIGN_HASH'}
            </span>
          </div>
        )}
      </div>

      {msg.role === 'user' && (
        <div className="w-6 h-6 rounded-md bg-[#1c1917] flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}
