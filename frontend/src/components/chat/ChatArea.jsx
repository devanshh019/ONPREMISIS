import { useRef, useEffect, useState } from 'react';
import { ShieldCheck, ArrowDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ThinkingIndicator from './ThinkingIndicator';

export default function ChatArea({
  messages,
  scenarios,
  isCurrentSessionLoading,
  elapsedTimer,
  thinkingExpanded,
  setThinkingExpanded,
  activeTaskMeta,
  selectedDeliverable,
  onSelectDeliverable,
  onSend,
  loading,
  healthData,
  onExpandImage,
  currentSessionId,
}) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    isUserAtBottomRef.current = isAtBottom;
    setShowScrollBottomBtn(!isAtBottom && messages.length > 2);
  };

  const scrollToBottom = (force = false) => {
    if (force || isUserAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    isUserAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 40);
  }, [currentSessionId]);

  useEffect(() => {
    if (isUserAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages.length, isCurrentSessionLoading]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-16 lg:px-24 py-8 space-y-6 relative"
      >
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto my-auto py-12 text-center space-y-6">
            <div className="inline-flex p-3.5 rounded-2xl bg-[#ffffff] border border-[#e5ded1] shadow-sm">
              <ShieldCheck className="w-8 h-8 text-[#ea580c]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold tracking-tight text-[#1c1917]">
                How can ONPREMISIS assist you today?
              </h2>
              <p className="text-xs text-[#57534e] max-w-md mx-auto leading-relaxed">
                On-premises sovereign engineering assistant powered by <strong>Gemma 3 4B</strong>.
                Zero cloud telemetry, sandboxed calculation verification, and official PSU Word/Excel/PowerPoint deliverables.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => onSend(sc.prompt)}
                  className="p-3.5 rounded-xl border border-[#e5ded1] bg-[#ffffff] hover:bg-[#fcfbf9] hover:border-[#ea580c] transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#1c1917] group-hover:text-[#ea580c] transition-colors">
                      {sc.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78716c] line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              selectedDeliverable={selectedDeliverable}
              onSelectDeliverable={onSelectDeliverable}
              onExpandImage={onExpandImage}
            />
          ))
        )}

        {isCurrentSessionLoading && (
          <ThinkingIndicator
            elapsedTimer={elapsedTimer}
            thinkingExpanded={thinkingExpanded}
            setThinkingExpanded={setThinkingExpanded}
            activeTaskMeta={activeTaskMeta}
            healthData={healthData}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {showScrollBottomBtn && (
        <button
          onClick={() => {
            isUserAtBottomRef.current = true;
            scrollToBottom(true);
          }}
          className="absolute bottom-4 right-8 p-2.5 rounded-full bg-[#1c1917] text-white shadow-lg hover:bg-[#ea580c] transition-all flex items-center space-x-1.5 text-xs font-mono z-30 group"
        >
          <ArrowDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
          <span className="text-[10px] pr-1">Latest Messages</span>
        </button>
      )}
    </div>
  );
}
