import { PanelLeft, Lock, FileText, FileCheck, Mic } from 'lucide-react';

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  rightPanelOpen,
  setRightPanelOpen,
  healthData,
  allArtifactsCount,
  selectedDeliverable,
  onOpenModal,
}) {
  return (
    <header className="h-14 border-b border-[#e5ded1] bg-[#faf8f5]/90 backdrop-blur px-5 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center space-x-3">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-[#78716c] hover:text-[#1c1917] rounded hover:bg-[#f4efe6] transition-colors"
            title="Open sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold tracking-wide text-[#1c1917] uppercase">
            {healthData?.active_foundation_model || 'Local Sovereign Assistant'}
          </span>
          <button
            onClick={() => onOpenModal('models')}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors flex items-center space-x-1 ${healthData?.ollama_backend?.available
                ? 'bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0] hover:bg-[#dcfce7]'
                : 'bg-[#fff7ed] text-[#ea580c] border-[#fed7aa] hover:bg-[#ffedd5]'
              }`}
            title="Click to view model settings"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${healthData?.ollama_backend?.available ? 'bg-[#16a34a]' : 'bg-[#ea580c]'}`} />
            <span>{healthData?.ollama_backend?.available ? (healthData.ollama_backend.active_model || 'Ollama Connected') : 'Ollama Offline'}</span>
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-3 text-xs">
        <button
          onClick={() => onOpenModal('sentinel')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#ffffff] text-[#1c1917] hover:bg-[#f4efe6] border border-[#d6cebf] transition-colors font-mono text-[11px] shadow-sm"
        >
          <Lock className="w-3 h-3 text-[#ea580c]" />
          <span>0 B Egress</span>
        </button>
        <button
          onClick={() => onOpenModal('deliverables')}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#ffffff] text-[#1c1917] hover:bg-[#f4efe6] border border-[#d6cebf] transition-colors font-mono text-[11px] shadow-sm"
        >
          <FileText className="w-3 h-3 text-[#78716c]" />
          <span>Deliverables ({allArtifactsCount})</span>
        </button>
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className={`p-1.5 rounded-md border transition-colors ${rightPanelOpen
              ? 'bg-[#ea580c] text-white border-[#ea580c]'
              : 'bg-[#ffffff] text-[#78716c] hover:text-[#1c1917] border-[#d6cebf]'
            }`}
          title={rightPanelOpen ? "Hide right panel" : "Show right panel"}
        >
          {selectedDeliverable ? <FileCheck className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
