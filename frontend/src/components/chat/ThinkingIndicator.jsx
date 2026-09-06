import {
  Cpu, Activity, Terminal, ChevronDown, ChevronRight,
  CheckCircle2, AlertCircle
} from 'lucide-react';

export default function ThinkingIndicator({
  elapsedTimer,
  thinkingExpanded,
  setThinkingExpanded,
  activeTaskMeta,
  healthData,
}) {
  return (
    <div className="flex space-x-3 max-w-3xl mx-auto items-start animate-in fade-in duration-200">
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#ea580c] via-[#f97316] to-[#fbbf24] animate-slime shadow-sm" />
        <div className="absolute inset-0 w-6 h-6 rounded-full bg-[#ea580c]/20 animate-ping pointer-events-none" />
      </div>

      <div className="flex flex-col space-y-2 w-full max-w-xl">
        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-2 py-1 px-3 rounded-full bg-[#fff7ed] border border-[#fed7aa] text-[11px] font-mono text-[#1c1917] w-fit shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-[#ea580c] animate-spin" />
            <span className="font-bold text-[#c2410c]">
              Agentic ReAct: {activeTaskMeta?.activeModel || activeTaskMeta?.model || 'Local Model'}
              {activeTaskMeta?.isFallback && (
                <span className="ml-1 text-[10px] text-[#ea580c] font-semibold">(Fallback Active)</span>
              )}
            </span>
            <span className="text-[#fed7aa]">•</span>
            <span className="text-[#9a3412] font-bold text-[10px]">{elapsedTimer}s</span>
          </div>

          <button
            type="button"
            onClick={() => setThinkingExpanded(!thinkingExpanded)}
            className="inline-flex items-center space-x-1.5 py-1 px-2.5 rounded-full bg-[#f4efe6] hover:bg-[#ede7dc] border border-[#e5ded1] text-[10px] font-mono text-[#78716c] hover:text-[#1c1917] transition-all cursor-pointer"
          >
            <span>{thinkingExpanded ? 'Hide Routing' : 'View Routing'}</span>
            {thinkingExpanded ? <ChevronDown className="w-3 h-3 text-[#ea580c]" /> : <ChevronRight className="w-3 h-3 text-[#78716c]" />}
          </button>
        </div>

        {thinkingExpanded && (
          <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#e5ded1] text-[11px] font-mono text-[#57534e] space-y-2.5 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2 text-[10px] font-semibold text-[#78716c]">
              <div className="flex items-center space-x-1.5 text-[#ea580c]">
                <Terminal className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>LIVE ROUTING & EXECUTION TELEMETRY</span>
              </div>
              <span className="text-[#16a34a] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#bbf7d0]">
                100% AIR-GAPPED (0 B EGRESS)
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="p-2 rounded-lg bg-[#faf8f5] border border-[#e5ded1] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                    <span className="font-semibold text-[#1c1917]">Intent Vector Classification</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded border border-[#bbf7d0]">
                    COMPLETED
                  </span>
                </div>
                <div className="text-[10px] text-[#78716c] pl-5.5">
                  Category: <strong className="text-[#ea580c]">{activeTaskMeta?.taskType || 'STANDARDS_AND_GOVERNANCE_REASONING'}</strong>
                </div>
                <div className="text-[10px] text-[#78716c] pl-5.5">
                  Dispatched Persona: <strong className="text-[#1c1917]">{activeTaskMeta?.model || 'Gemma 3 4B Sovereign Standards & Governance'}</strong>
                </div>
                {activeTaskMeta?.isFallback && (
                  <div className="mt-1 p-2 rounded bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412] text-[10px] flex items-start space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#ea580c] shrink-0 mt-0.5" />
                    <div className="leading-tight">
                      <strong>Fallback Triggered:</strong> Model <code className="px-1 py-0.5 rounded bg-[#f4efe6] font-mono text-[9px] text-[#ea580c]">{activeTaskMeta?.requestedModel}</code> not found in local Ollama; executing on <code className="px-1 py-0.5 rounded bg-[#f4efe6] font-mono text-[9px] text-[#ea580c] font-bold">{activeTaskMeta?.activeModel}</code>.
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2 rounded-lg bg-[#fffaf5] border border-[#fed7aa] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ea580c] animate-ping shrink-0" />
                    <span className="font-semibold text-[#1c1917]">ReAct Multi-Turn Engine</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#ea580c] bg-[#fff7ed] px-1.5 py-0.5 rounded border border-[#fed7aa] animate-pulse">
                    RUNNING
                  </span>
                </div>
                <div className="text-[10px] text-[#78716c] pl-5.5">
                  Action: Ingesting prompt context, evaluating knowledge base & executing sandbox tools.
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#f0eae0] flex items-center justify-between text-[10px] text-[#78716c]">
              <span>Host: <strong className="text-[#1c1917]">{healthData?.ollama_backend?.endpoint || 'http://127.0.0.1:11434'}</strong></span>
              <span className="text-[#ea580c] font-semibold flex items-center">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                Generating Sovereign Tokens...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
