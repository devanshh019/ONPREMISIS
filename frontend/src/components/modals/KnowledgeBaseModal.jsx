import { BookOpen, Search, FileText, UploadCloud, Trash2, X } from 'lucide-react';

export default function KnowledgeBaseModal({
  kbTab,
  setKbTab,
  kbQuery,
  setKbQuery,
  kbResults,
  kbDocuments,
  kbUploadLoading,
  kbFileInputRef,
  onKbSearch,
  onKbUpload,
  onKbDelete,
  onFetchKbDocuments,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#d6cebf] rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 text-xs text-[#1c1917] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#e5ded1] pb-3 shrink-0">
          <div className="flex items-center space-x-2 font-bold text-[#1c1917]">
            <BookOpen className="w-4 h-4 text-[#ea580c]" />
            <span>DYNAMIC LOCAL RAG KNOWLEDGE BASE</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setKbTab('search')}
              className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors ${kbTab === 'search' ? 'bg-[#ea580c] text-white shadow-xs' : 'bg-[#faf8f5] text-[#78716c] hover:bg-[#ede7dc]'
                }`}
            >Search Index</button>
            <button
              type="button"
              onClick={() => {
                setKbTab('manage');
                onFetchKbDocuments();
              }}
              className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors ${kbTab === 'manage' ? 'bg-[#ea580c] text-white shadow-xs' : 'bg-[#faf8f5] text-[#78716c] hover:bg-[#ede7dc]'
                }`}
            >Documents ({kbDocuments.length})</button>
            <button onClick={onClose} className="text-[#78716c] hover:text-[#1c1917] p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {kbTab === 'search' ? (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            <form onSubmit={onKbSearch} className="flex space-x-2">
              <input
                type="text"
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                placeholder="Search indexed RAG documents & standards..."
                className="flex-1 bg-[#faf8f5] border border-[#d6cebf] rounded-lg px-3 py-2 text-xs text-[#1c1917] focus:outline-none focus:border-[#ea580c]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold flex items-center space-x-1 shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>
            <div className="space-y-2">
              {kbResults.length === 0 ? (
                <div className="p-8 text-center text-[#78716c] font-mono text-xs">
                  {kbDocuments.length === 0
                    ? "No documents indexed yet. Switch to 'Documents' tab to upload PDFs, Word files, or TXT standards."
                    : "Type a query above to search through indexed RAG chunks."}
                </div>
              ) : (
                kbResults.map((chunk, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-[#faf8f5] border border-[#e5ded1] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[#1c1917] flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#ea580c]" />
                        <span>{chunk.title}</span>
                        {chunk.chunk_index && (
                          <span className="text-[10px] font-mono text-[#78716c]">
                            (Chunk {chunk.chunk_index}/{chunk.total_chunks})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffffff] text-[#16a34a] border border-[#bbf7d0]">
                        {Math.round(chunk.relevance_score * 100)}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-[#44403c] font-mono leading-relaxed bg-[#ffffff] p-2.5 rounded border border-[#e5ded1] whitespace-pre-wrap">
                      {chunk.full_content || chunk.excerpt}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  onKbUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => kbFileInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-[#d6cebf] hover:border-[#ea580c] rounded-xl bg-[#faf8f5] text-center space-y-2 transition-colors cursor-pointer"
            >
              <input
                type="file"
                ref={kbFileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onKbUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.md,.csv,.json"
              />
              <UploadCloud className="w-8 h-8 text-[#ea580c] mx-auto" />
              <div className="text-xs font-semibold text-[#1c1917]">
                {kbUploadLoading ? "Parsing and indexing document into RAG..." : "Click or drag & drop files to index into RAG"}
              </div>
              <p className="text-[10px] text-[#78716c]">
                Supports PDF, Word (.docx), TXT, Markdown, CSV. Automatically chunked with local TF-IDF / BM25 index.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-[#78716c] tracking-wider">
                Indexed Documents ({kbDocuments.length})
              </div>
              {kbDocuments.length === 0 ? (
                <div className="p-4 text-center text-[#a8a29e] font-mono text-xs bg-[#faf8f5] rounded-lg border border-[#e5ded1]">
                  No documents indexed yet. Upload files above to build your on-premises knowledge base.
                </div>
              ) : (
                kbDocuments.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#faf8f5] border border-[#e5ded1]"
                  >
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      <div className="p-1.5 rounded bg-[#ffffff] border border-[#d6cebf]">
                        <FileText className="w-4 h-4 text-[#ea580c]" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[#1c1917] truncate">{doc.filename}</div>
                        <div className="text-[10px] font-mono text-[#78716c]">
                          {doc.chunk_count} Chunks • {Math.round(doc.size_bytes / 1024)} KB • {doc.character_count} chars
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onKbDelete(doc.doc_id)}
                      className="p-1.5 text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#ffffff] rounded transition-colors"
                      title="Delete document from RAG index"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
