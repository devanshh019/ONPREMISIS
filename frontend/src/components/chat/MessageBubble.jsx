import { useState } from 'react';
import {
  Bot, User, Lock, Terminal, Download, Eye,
  ChevronDown, ChevronRight
} from 'lucide-react';
import FormattedMarkdown from './FormattedMarkdown';
import { getArtifactIcon } from '../../utils/helpers';

export default function MessageBubble({
  msg,
  selectedDeliverable,
  onSelectDeliverable,
}) {
  const [expandedTraces, setExpandedTraces] = useState({});
  const [expandedSteps, setExpandedSteps] = useState({});

  const toggleTrace = (msgId) => {
    setExpandedTraces(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleStep = (msgId, stepNum) => {
    const key = `${msgId}-${stepNum}`;
    setExpandedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isTraceExpanded = expandedTraces[msg.id] || false;

  return (
    <div
      className={`flex space-x-3 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'
        }`}
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
        {msg.role === 'assistant' && msg.routing && (
          <div className="flex items-center justify-between pb-2 border-b border-[#f0eae0] text-[11px] font-mono text-[#78716c]">
            <div className="flex items-center space-x-2">
              <span className="text-[#ea580c] font-semibold">{msg.routing.model_name}</span>
            </div>
            {msg.elapsed_seconds && (
              <span>Executed in {msg.elapsed_seconds}s</span>
            )}
          </div>
        )}
        <FormattedMarkdown content={msg.content} />
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
                    {msg.sandbox_output.plots.map((plot, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => onSelectDeliverable(plot)}
                        className="p-2 rounded bg-[#ffffff] border border-[#e5ded1] cursor-pointer hover:border-[#ea580c] transition-all"
                      >
                        <img src={plot.path} alt={plot.title} className="rounded w-full object-contain max-h-56" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {msg.steps && msg.steps.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => toggleTrace(msg.id)}
              className="w-fit flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#f4efe6] hover:bg-[#ede7dc] border border-[#e5ded1] text-[11px] font-mono text-[#78716c] hover:text-[#1c1917] transition-all group"
            >
              <Terminal className="w-3.5 h-3.5 text-[#ea580c] group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Execution Trace ({msg.steps.length} Phases)</span>
              {isTraceExpanded ? (
                <ChevronDown className="w-3 h-3 text-[#78716c]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[#78716c]" />
              )}
            </button>
            {isTraceExpanded && (
              <div className="mt-2 space-y-1.5 p-2 rounded-lg bg-[#faf8f5] border border-[#e5ded1]">
                {msg.steps.map((st) => {
                  const isStepExpanded = expandedSteps[`${msg.id}-${st.step_number}`];
                  return (
                    <div
                      key={st.step_number}
                      className="rounded-lg border border-[#e5ded1] bg-[#ffffff] overflow-hidden text-xs"
                    >
                      <button
                        onClick={() => toggleStep(msg.id, st.step_number)}
                        className="w-full flex items-center justify-between p-2 hover:bg-[#f4efe6] text-left font-mono text-[11px]"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c] shrink-0" />
                          <span className="font-medium text-[#1c1917] truncate">
                            Phase {st.step_number}: {st.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[#78716c] shrink-0">
                          <span>{st.duration_ms}ms</span>
                          {isStepExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                      </button>
                      {isStepExpanded && (
                        <div className="p-3 pt-1 border-t border-[#e5ded1] bg-[#faf8f5] space-y-2 text-[#44403c]">
                          {st.details && <p className="text-[#44403c]">{st.details}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
                  onClick={() => onSelectDeliverable(art)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all group ${selectedDeliverable?.filename === art.filename
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
                      href={art.path}
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
        {msg.sovereign_proof && (
          <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-[#78716c] border-t border-[#f0eae0]">
            <span className="text-[#57534e] flex items-center">
              <Lock className="w-3 h-3 mr-1 text-[#ea580c]" />
              100% Air-Gapped (0 Bytes Exfiltrated)
            </span>
            <span className="truncate max-w-[160px] text-[#a8a29e]">
              {msg.sovereign_proof.audit_hash.slice(0, 16)}...
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
