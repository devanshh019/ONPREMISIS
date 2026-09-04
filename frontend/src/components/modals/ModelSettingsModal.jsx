import { Cpu, RefreshCw, AlertCircle, X } from 'lucide-react';

export default function ModelSettingsModal({
  healthData,
  onSelectModel,
  onRefreshHealth,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#d6cebf] rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 text-xs font-mono text-[#1c1917]">
        <div className="flex items-center justify-between border-b border-[#e5ded1] pb-3">
          <div className="flex items-center space-x-2 font-bold text-[#1c1917]">
            <Cpu className="w-4 h-4 text-[#ea580c]" />
            <span>LOCAL SOVEREIGN FOUNDATION MODEL</span>
          </div>
          <button onClick={onClose} className="text-[#78716c] hover:text-[#1c1917]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#e5ded1] space-y-2.5 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${healthData?.ollama_backend?.available ? 'bg-[#16a34a] animate-pulse' : 'bg-[#ea580c]'}`} />
              <span className="font-semibold text-xs">
                {healthData?.ollama_backend?.available ? 'Ollama Daemon Connected' : 'Ollama Daemon Offline'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#78716c]">
              {healthData?.ollama_backend?.endpoint || 'http://127.0.0.1:11434'}
            </span>
          </div>
          <div className="text-[11px] text-[#57534e]">
            Active Model: <strong className="text-[#1c1917]">{healthData?.active_foundation_model || healthData?.active_model_id || 'Auto-Detected'}</strong> (~3.4 GB RAM allocation)
          </div>
          {healthData?.ollama_backend?.models && healthData.ollama_backend.models.length > 0 ? (
            <div className="space-y-1.5 pt-2 border-t border-[#e5ded1]">
              <div className="text-[10px] uppercase font-bold text-[#78716c] font-mono">Installed Ollama Models:</div>
              <div className="flex flex-wrap gap-1.5">
                {healthData.ollama_backend.models.map((mTag) => (
                  <button
                    key={mTag}
                    onClick={() => onSelectModel(mTag)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${(healthData.active_model_id === mTag || healthData.active_foundation_model === mTag)
                        ? 'bg-[#ea580c] text-white font-bold shadow-xs'
                        : 'bg-[#ffffff] text-[#44403c] border border-[#d6cebf] hover:border-[#ea580c]'
                      }`}
                  >{mTag}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[11px] text-[#9a3412] space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Ollama Connection Notice</span>
              </div>
              <p>Start your local model in terminal:</p>
              <code className="block p-1.5 rounded bg-[#ffffff] font-mono text-[10px] text-[#ea580c] border border-[#fed7aa]">
                ollama run llama3 &nbsp;# or: ollama run gemma3:4b
              </code>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2 border-t border-[#e5ded1]">
          <button
            onClick={onRefreshHealth}
            className="px-3 py-1.5 rounded-lg bg-[#faf8f5] hover:bg-[#ede7dc] text-[#1c1917] font-semibold flex items-center space-x-1.5 border border-[#d6cebf] text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Refresh Connection</span>
          </button>
        </div>
      </div>
    </div>
  );
}
