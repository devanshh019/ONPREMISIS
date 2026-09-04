import { Activity, ChevronDown, ChevronRight } from 'lucide-react';

export default function ThinkingIndicator({
  elapsedTimer,
  thinkingExpanded,
  setThinkingExpanded,
  activeTaskMeta,
}) {
  return (
    <div className="flex space-x-3 max-w-3xl mx-auto items-start">
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#ea580c] via-[#f97316] to-[#fbbf24] animate-slime shadow-sm" />
        <div className="absolute inset-0 w-6 h-6 rounded-full bg-[#ea580c]/20 animate-ping pointer-events-none" />
      </div>
      <div className="flex flex-col space-y-1.5">
        <button
          type="button"
          onClick={() => setThinkingExpanded(!thinkingExpanded)}
          className="inline-flex items-center space-x-2 py-1 px-3 rounded-full bg-[#f4efe6] hover:bg-[#ede7dc] border border-[#e5ded1] text-[11px] font-mono text-[#1c1917] w-fit shadow-xs transition-all cursor-pointer group"
        >
          <span className="font-semibold text-[#ea580c]">Thinking</span>
          <span className="text-[#a8a29e]">•</span>
          <span className="text-[#1c1917] font-semibold text-[10px]">{elapsedTimer}s</span>
          <span className="text-[#a8a29e]">•</span>
          <span className="text-[#78716c] group-hover:text-[#1c1917] text-[10px]">
            {thinkingExpanded ? "Hide details" : "Inspect process"}
          </span>
          {thinkingExpanded ? (
            <ChevronDown className="w-3 h-3 text-[#78716c] group-hover:text-[#ea580c] transition-colors" />
          ) : (
            <ChevronRight className="w-3 h-3 text-[#78716c] group-hover:text-[#ea580c] transition-colors" />
          )}
        </button>
        {thinkingExpanded && activeTaskMeta && (
          <div className="p-3 rounded-xl bg-[#f4efe6] border border-[#e5ded1] text-[11px] font-mono text-[#57534e] space-y-2 max-w-md shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#e5ded1] pb-1.5">
              <div className="flex items-center space-x-1.5 text-[#ea580c] font-semibold text-[10px] uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>{activeTaskMeta.taskType}</span>
              </div>
              <span className="text-[10px] text-[#1c1917] font-bold bg-[#ffffff] px-2 py-0.5 rounded border border-[#d6cebf]">
                {elapsedTimer}s
              </span>
            </div>
            <p className="text-[#1c1917] font-medium leading-relaxed">
              {activeTaskMeta.targetAction}
            </p>
            <div className="pt-1.5 border-t border-[#e5ded1] grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-[#78716c]">Inference Host:</span>{" "}
                <span className="text-[#1c1917] font-semibold">{activeTaskMeta.model}</span>
              </div>
              <div>
                <span className="text-[#78716c]">Egress:</span>{" "}
                <span className="text-[#16a34a] font-semibold">{activeTaskMeta.networkEgress}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
