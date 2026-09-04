import { Send, Paperclip, Mic, FileText, X } from 'lucide-react';

export default function ChatInput({
  prompt,
  setPrompt,
  loading,
  healthData,
  attachedFiles,
  isDragging,
  setIsDragging,
  fileInputRef,
  onSubmit,
  onFileSelect,
  onFilesAdd,
  onRemoveAttachment,
  onOpenVoice,
}) {
  return (
    <div className="p-4 bg-gradient-to-t from-[#faf8f5] via-[#faf8f5]/90 to-transparent shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesAdd(Array.from(e.dataTransfer.files));
          }
        }}
        className={`max-w-3xl mx-auto relative bg-[#ffffff] border ${isDragging ? 'border-[#ea580c] ring-2 ring-[#ea580c]/20' : 'border-[#d6cebf]'
          } rounded-xl shadow-md p-2 focus-within:border-[#ea580c] transition-all`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,.csv,.py"
        />
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 mb-1.5 border-b border-[#f0eae0]">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#faf8f5] border border-[#d6cebf] text-xs shadow-2xs group"
              >
                {file.preview ? (
                  <img src={file.preview} alt="preview" className="w-4 h-4 object-cover rounded" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#ea580c]" />
                )}
                <span className="font-mono text-[11px] text-[#1c1917] max-w-[120px] truncate">{file.name}</span>
                <span className="text-[10px] text-[#a8a29e] font-mono">({Math.round(file.size / 1024)} KB)</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(idx)}
                  className="p-0.5 text-[#a8a29e] hover:text-[#dc2626] rounded transition-colors"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-[#78716c] hover:text-[#ea580c] hover:bg-[#f4efe6] transition-colors"
            title="Attach files (PDF, images, Word, Excel, text)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              attachedFiles.length > 0
                ? "Ask about attached file(s) or leave empty for analysis..."
                : `Ask ${healthData?.active_foundation_model || 'Local Model'} (e.g. 'Draft API 510 Turnaround Note' or 'Simulate heat exchanger')...`
            }
            disabled={loading}
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none font-sans"
          />
          <button
            type="button"
            onClick={onOpenVoice}
            className="p-1.5 rounded-lg text-[#78716c] hover:text-[#ea580c] hover:bg-[#f4efe6] transition-colors"
            title="Open Voice Dictation"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={loading || (!prompt.trim() && attachedFiles.length === 0)}
            className={`p-2 rounded-lg transition-all ${loading || (!prompt.trim() && attachedFiles.length === 0)
                ? 'bg-[#ede7dc] text-[#a8a29e] cursor-not-allowed'
                : 'bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold shadow-sm'
              }`}
            title="Send Task"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-[#78716c] font-mono border-t border-[#f0eae0] mt-1">
          <span>{healthData?.active_foundation_model || 'Local Model'} (~3.4 GB RAM)</span>
          <span>100% On-Premises • Zero Egress</span>
        </div>
      </form>
    </div>
  );
}
