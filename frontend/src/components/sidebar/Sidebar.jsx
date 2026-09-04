import {
  ShieldCheck, Plus, PanelLeftClose,
  FileText, BookOpen, Cpu
} from 'lucide-react';
import ChatHistoryList from './ChatHistoryList';

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  sessions,
  currentSessionId,
  loadingSessionId,
  loading,
  healthData,
  scenarios,
  allArtifactsCount,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onSend,
  onOpenModal,
}) {
  return (
    <aside
      className={`${sidebarOpen ? 'w-64' : 'w-0 -translate-x-full'
        } transition-all duration-300 ease-in-out bg-[#f4efe6] border-r border-[#e5ded1] flex flex-col justify-between shrink-0 z-30 overflow-hidden select-none`}
    >
      <div className="flex flex-col h-full overflow-hidden p-4">

        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-md bg-[#ea580c] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-wider text-[#1c1917] uppercase">KAVACH</h1>
              <p className="text-[9px] text-[#78716c] font-mono tracking-tight">SOVEREIGN WORKBENCH</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-[#78716c] hover:text-[#1c1917] rounded hover:bg-[#ede7dc] transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border border-[#d6cebf] bg-[#ffffff] hover:bg-[#fcfbf9] text-xs font-semibold text-[#1c1917] transition-all mb-3 shadow-sm group"
        >
          <Plus className="w-3.5 h-3.5 text-[#ea580c] group-hover:scale-110 transition-transform" />
          <span>New Task</span>
        </button>
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="text-[10px] uppercase tracking-wider text-[#78716c] px-1 mb-1.5 font-bold flex items-center justify-between">
            <span>Chat History</span>
            <span className="text-[9px] font-mono font-normal text-[#a8a29e]">{sessions.length} chats</span>
          </div>
          <ChatHistoryList
            sessions={sessions}
            currentSessionId={currentSessionId}
            loadingSessionId={loadingSessionId}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
          />
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#78716c] px-1 mb-1.5 font-bold">
                Standard Workflows
              </div>
              <div className="space-y-1">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => onSend(sc.prompt)}
                    disabled={loading}
                    className="w-full text-left p-2 rounded-lg text-xs hover:bg-[#ede7dc] text-[#44403c] hover:text-[#1c1917] transition-colors group flex items-start space-x-2 border border-transparent hover:border-[#d6cebf]"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c] mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                    <div className="flex-1 truncate">
                      <div className="font-medium text-[#1c1917] truncate group-hover:text-[#ea580c] transition-colors text-[11px]">
                        {sc.title}
                      </div>
                      <div className="text-[9px] text-[#78716c] truncate">{sc.badge}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#78716c] px-1 mb-1.5 font-bold">
                Integrity & Tools
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => onOpenModal('sentinel')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-[#ede7dc] text-[#44403c] hover:text-[#1c1917] transition-colors"
                >
                  <div className="flex items-center space-x-2 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>Air-Gap Sentinel</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ffffff] text-[#1c1917] border border-[#d6cebf]">0 B Egress</span>
                </button>
                <button
                  onClick={() => onOpenModal('deliverables')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-[#ede7dc] text-[#44403c] hover:text-[#1c1917] transition-colors"
                >
                  <div className="flex items-center space-x-2 text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-[#78716c]" />
                    <span>Deliverables Hub</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ffffff] text-[#1c1917] border border-[#d6cebf]">{allArtifactsCount}</span>
                </button>
                <button
                  onClick={() => onOpenModal('kb')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-[#ede7dc] text-[#44403c] hover:text-[#1c1917] transition-colors"
                >
                  <div className="flex items-center space-x-2 text-[11px]">
                    <BookOpen className="w-3.5 h-3.5 text-[#78716c]" />
                    <span>Plant Standards</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ffffff] text-[#1c1917] border border-[#d6cebf]">ASME / API</span>
                </button>
                <button
                  onClick={() => onOpenModal('models')}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-[#ede7dc] text-[#44403c] hover:text-[#1c1917] transition-colors"
                >
                  <div className="flex items-center space-x-2 text-[11px]">
                    <Cpu className="w-3.5 h-3.5 text-[#78716c]" />
                    <span>Model Settings</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ffffff] text-[#1c1917] border border-[#d6cebf]">4B Class</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-[#e5ded1] text-[10px] text-[#78716c] space-y-0.5">
          <div className="flex items-center justify-between">
            <span>Foundation Model:</span>
            <span className="text-[#1c1917] font-semibold truncate max-w-[110px]">{healthData?.active_foundation_model || 'Local Model'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>RAM Allocation:</span>
            <span className="text-[#1c1917] font-mono">{healthData?.ram_allocated_gb || 3.4} GB</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[#57534e] pt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${healthData?.ollama_backend?.available ? 'bg-[#16a34a]' : 'bg-[#ea580c]'}`}></span>
            <span>{healthData?.ollama_backend?.available ? 'Ollama Online' : '100% On-Premises Isolated'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
