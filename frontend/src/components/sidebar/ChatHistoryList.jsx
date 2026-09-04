import { MessageSquare, Trash2 } from 'lucide-react';

export default function ChatHistoryList({
  sessions,
  currentSessionId,
  loadingSessionId,
  onSelectSession,
  onDeleteSession,
}) {
  return (
    <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-none max-h-[38%] border-b border-[#e5ded1] pb-2 mb-3">
      {sessions.map((s) => {
        const isActive = s.id === currentSessionId;
        return (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all group ${
              isActive
                ? 'bg-[#ffffff] text-[#1c1917] font-semibold border border-[#d6cebf] shadow-xs'
                : 'text-[#57534e] hover:bg-[#ede7dc] hover:text-[#1c1917] border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2 truncate mr-1">
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#ea580c]' : 'text-[#a8a29e]'}`} />
              <span className="truncate text-[11px]">{s.title}</span>
              {loadingSessionId === s.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-ping shrink-0 ml-1" title="Thinking..." />
              )}
            </div>
            {sessions.length > 1 && (
              <button
                onClick={(e) => onDeleteSession(e, s.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-[#a8a29e] hover:text-[#dc2626] rounded transition-opacity"
                title="Delete chat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
