export default function FormattedMarkdown({ content }) {
  if (!content) return null;

  const formatInline = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1c1917] font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-[#f4efe6] border border-[#e5ded1] font-mono text-[11px] text-[#ea580c] font-medium">$1</code>');
  };

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed text-[#1c1917]">
      {parts.map((part, pIdx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          const lang = part.slice(3, firstLineEnd).trim() || 'code';
          const codeContent = part.slice(firstLineEnd + 1, -3).trim();

          return (
            <div key={pIdx} className="my-2.5 rounded-lg bg-[#f4efe6] border border-[#e5ded1] overflow-hidden font-mono text-[11px] shadow-xs">
              <div className="px-3 py-1 bg-[#ede7dc] border-b border-[#e5ded1] text-[10px] text-[#78716c] font-semibold uppercase flex justify-between items-center">
                <span>{lang}</span>
              </div>
              <pre className="p-3 overflow-x-auto text-[#1c1917] whitespace-pre">{codeContent}</pre>
            </div>
          );
        }

        const lines = part.split('\n');
        const renderedElements = [];
        let inAlert = false;
        let alertLines = [];

        lines.forEach((line, lIdx) => {
          if (line.startsWith('> [!WARNING]') || line.startsWith('> [!IMPORTANT]')) {
            inAlert = true;
            return;
          }
          if (inAlert) {
            if (line.startsWith('>')) {
              alertLines.push(line.replace(/^>\s*/, ''));
              return;
            } else {
              renderedElements.push(
                <div key={`al-${lIdx}`} className="p-3 my-2 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412] space-y-1">
                  {alertLines.map((al, aIdx) => (
                    <div key={aIdx} dangerouslySetInnerHTML={{ __html: formatInline(al) }} />
                  ))}
                </div>
              );
              inAlert = false;
              alertLines = [];
            }
          }

          if (line.trim()) {
            renderedElements.push(
              <p key={lIdx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
            );
          }
        });

        if (inAlert && alertLines.length > 0) {
          renderedElements.push(
            <div key={`al-end`} className="p-3 my-2 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[#9a3412] space-y-1">
              {alertLines.map((al, aIdx) => (
                <div key={aIdx} dangerouslySetInnerHTML={{ __html: formatInline(al) }} />
              ))}
            </div>
          );
        }

        return <div key={pIdx} className="space-y-1.5">{renderedElements}</div>;
      })}
    </div>
  );
}
