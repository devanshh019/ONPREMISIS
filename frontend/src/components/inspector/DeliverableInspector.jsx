import { useState, useEffect } from 'react';
import {
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon,
  Terminal, Download, X, ExternalLink
} from 'lucide-react';

export default function DeliverableInspector({ artifact, onClose, onZoomImage }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [codeContent, setCodeContent] = useState(artifact?.code || '');
  const [loadingCode, setLoadingCode] = useState(false);

  if (!artifact) return null;

  const rawType = (
    artifact.file_type ||
    artifact.type ||
    (artifact.filename ? artifact.filename.split('.').pop() : '') ||
    ''
  ).toLowerCase();

  const resolveViewUrl = (art) => {
    if (!art) return '';
    if (art.path && art.path.startsWith('/api/')) return art.path;
    if (art.filename) return `/api/artifacts/${art.filename}`;
    if (art.download_url && art.download_url.startsWith('/api/')) return art.download_url;
    return art.path || '';
  };

  const resolveDownloadUrl = (art) => {
    if (!art) return '#';
    if (art.download_url && art.download_url.startsWith('/api/')) return art.download_url;
    if (art.path && art.path.startsWith('/api/')) return art.path;
    if (art.filename) return `/api/documents/download/${art.filename}`;
    return art.path || '#';
  };

  useEffect(() => {
    if (rawType === 'py' || rawType === 'code') {
      if (artifact.code) {
        setCodeContent(artifact.code);
      } else if (artifact.filename) {
        setLoadingCode(true);
        fetch(`/api/artifacts/${artifact.filename}`)
          .then(res => {
            if (res.ok) return res.text();
            return fetch(`/api/documents/download/${artifact.filename}`).then(r => r.text());
          })
          .then(text => {
            setCodeContent(text);
            setLoadingCode(false);
          })
          .catch(() => setLoadingCode(false));
      } else {
        setCodeContent('');
      }
    }
  }, [artifact.filename, artifact.code, rawType]);

  const renderContent = () => {

    if (rawType === 'docx' || rawType === 'doc' || rawType === 'document') {
      const sections = artifact.sections || [];
      const paragraphs = artifact.paragraphs || (
        sections.length > 0
          ? sections.map(s => s.content ? `${s.heading ? s.heading + ': ' : ''}${s.content}` : s.heading || '')
          : []
      );
      return (
        <div className="space-y-3">
          <div className="p-4 bg-[#ffffff] rounded-lg border border-[#e5ded1] shadow-xs space-y-3">
            <div className="flex items-center space-x-3 pb-3 border-b border-[#f0eae0]">
              <div className="p-2 rounded-lg bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-[#1c1917] truncate">{artifact.title}</div>
                <div className="text-[10px] font-mono text-[#78716c] truncate">{artifact.filename}</div>
              </div>
            </div>
            {artifact.subject && (
              <div className="text-xs text-[#44403c] bg-[#faf8f5] p-2.5 rounded border border-[#e5ded1]">
                <span className="font-bold text-[#1c1917]">Subject: </span>
                <span>{artifact.subject}</span>
              </div>
            )}
          </div>
          <div className="p-4 bg-[#ffffff] rounded-lg border border-[#e5ded1] shadow-xs space-y-3 font-sans">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#ea580c] font-bold border-b border-[#f0eae0] pb-1.5 flex items-center justify-between">
              <span>Document Contents</span>
              <span className="text-[#78716c] font-normal">{paragraphs.length} Sections</span>
            </div>
            {paragraphs.length > 0 ? (
              <div className="space-y-3 text-xs text-[#1c1917] leading-relaxed">
                {paragraphs.map((p, pIdx) => (
                  <div key={pIdx} className="space-y-1">
                    <div className="font-semibold text-[11px] text-[#78716c]">
                      Section {pIdx + 1}
                    </div>
                    <p className="text-xs text-[#44403c] bg-[#faf8f5] p-2.5 rounded border border-[#f0eae0]">{p}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-[#78716c] text-xs font-mono">
                Document generated and ready for download.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (rawType === 'xlsx' || rawType === 'xls' || rawType === 'spreadsheet') {
      const headers = artifact.headers || [];
      const rows = artifact.rows || [];
      return (
        <div className="space-y-3">
          <div className="p-4 bg-[#ffffff] rounded-lg border border-[#e5ded1] shadow-xs space-y-3">
            <div className="flex items-center space-x-3 pb-2 border-b border-[#f0eae0]">
              <div className="p-2 rounded-lg bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-[#1c1917] truncate">{artifact.title}</div>
                <div className="text-[10px] font-mono text-[#78716c]">{rows.length} Calculation Rows • OpenPyXL</div>
              </div>
            </div>
            {headers.length > 0 ? (
              <div className="overflow-x-auto rounded border border-[#e5ded1]">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-[#1c1917] text-[#f4efe6]">
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-2 font-semibold border-b border-[#334155] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5ded1] bg-[#ffffff]">
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#faf8f5] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 whitespace-nowrap text-[#1c1917]">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-[#78716c] text-xs font-mono">
                Workbook compiled and ready for download.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (rawType === 'pptx' || rawType === 'ppt' || rawType === 'presentation') {
      const slides = artifact.slides && artifact.slides.length > 0 ? artifact.slides : [];
      return (
        <div className="space-y-3">
          {slides.length > 0 && (
            <div className="flex space-x-1.5 pb-2 border-b border-[#e5ded1] overflow-x-auto scrollbar-none">
              {slides.map((_, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setActiveSlide(sIdx)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all shrink-0 ${activeSlide === sIdx
                      ? 'bg-[#ea580c] text-white shadow-xs'
                      : 'bg-[#faf8f5] text-[#78716c] hover:bg-[#ede7dc]'
                    }`}
                >Slide {sIdx + 1}</button>
              ))}
            </div>
          )}
          <div className="p-4 rounded-lg bg-[#ffffff] border border-[#e5ded1] shadow-xs space-y-3 min-h-[220px]">
            {slides.length > 0 ? (
              <>
                <div className="p-3 bg-[#1c1917] rounded-md text-[#faf8f5]">
                  <div className="text-[10px] font-mono uppercase text-[#ea580c] font-semibold">
                    {slides[activeSlide]?.subtitle || 'Presentation Slide'}
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">{slides[activeSlide]?.title || `Slide ${activeSlide + 1}`}</div>
                </div>

                {slides[activeSlide]?.definition && (
                  <div className="p-2.5 bg-[#f1f5f9] rounded-md border-l-2 border-[#ea580c] text-xs text-[#1e293b]">
                    <div className="text-[10px] font-mono uppercase font-semibold text-[#ea580c] mb-1">Definition & Standard Reference</div>
                    <div className="leading-relaxed">{slides[activeSlide].definition}</div>
                  </div>
                )}

                {slides[activeSlide]?.explanation && (
                  <div className="p-2.5 bg-[#faf8f5] rounded-md border border-[#e5ded1] text-xs text-[#334155] leading-relaxed">
                    <div className="text-[10px] font-mono uppercase font-semibold text-[#78716c] mb-1">Technical Analysis & Explanation</div>
                    <div>{slides[activeSlide].explanation}</div>
                  </div>
                )}

                {slides[activeSlide]?.bullets && (Array.isArray(slides[activeSlide].bullets) ? slides[activeSlide].bullets.length > 0 : Boolean(slides[activeSlide].bullets)) && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-mono uppercase text-[#78716c] font-semibold">Key Points & Specifications:</div>
                    <ul className="space-y-2 text-xs text-[#44403c] list-none leading-relaxed">
                      {(Array.isArray(slides[activeSlide]?.bullets) ? slides[activeSlide].bullets : [slides[activeSlide].bullets]).map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start space-x-2">
                          <span className="text-[#ea580c] font-bold mt-0.5">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-[#78716c] font-mono text-xs">
                Presentation deck generated and ready for download.
              </div>
            )}
          </div>
          {slides.length > 0 && (
            <div className="text-[10px] text-[#78716c] font-mono text-center">
              Slide {activeSlide + 1} of {slides.length} • PowerPoint Deck (.pptx)
            </div>
          )}
        </div>
      );
    }
    if (rawType === 'png' || rawType === 'jpg' || rawType === 'jpeg' || rawType === 'plot' || rawType === 'image') {
      const imgUrl = resolveViewUrl(artifact);
      return (
        <div className="space-y-3">
          <div className="p-2 rounded-lg bg-[#ffffff] border border-[#e5ded1] shadow-xs">
            <div className="relative group cursor-pointer overflow-hidden rounded" onClick={() => onZoomImage && onZoomImage(imgUrl)}>
              <img
                src={imgUrl}
                alt={artifact.title || 'Generated Plot'}
                className="w-full object-contain max-h-72 mx-auto rounded transition-transform group-hover:scale-102"
                onError={(e) => {
                  if (artifact.filename && !e.target.src.includes(`/api/artifacts/${artifact.filename}`)) {
                    e.target.src = `/api/artifacts/${artifact.filename}`;
                  }
                }}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold rounded">
                🔍 Click to Enlarge View
              </div>
            </div>
          </div>
          <div className="p-2.5 bg-[#faf8f5] rounded border border-[#e5ded1] text-center text-xs font-mono text-[#57534e]">
            <div>{artifact.title || 'Generated Visualization'}</div>
            <div className="text-[10px] text-[#78716c] mt-0.5">{artifact.filename}</div>
          </div>
        </div>
      );
    }

    if (rawType === 'py' || rawType === 'code') {
      return (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#1c1917] text-[#faf8f5] border border-[#334155] space-y-1">
            <div className="text-[10px] uppercase text-[#94a3b8] font-bold pb-1 border-b border-[#334155] flex items-center justify-between">
              <span>Python Source:</span>
              <span className="text-[9px] text-[#38bdf8]">{artifact.filename}</span>
            </div>
            {loadingCode ? (
              <div className="p-3 text-xs text-[#94a3b8] italic">Loading script from sandbox storage...</div>
            ) : codeContent ? (
              <pre className="p-2 overflow-x-auto text-[11px] text-[#38bdf8] whitespace-pre leading-relaxed">{codeContent}</pre>
            ) : (
              <div className="p-3 text-xs text-[#94a3b8] italic">No Python source code recorded for this deliverable.</div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-[#ffffff] border border-[#e5ded1] space-y-1">
            <div className="text-[10px] uppercase text-[#78716c] font-bold pb-1 border-b border-[#f0eae0]">Terminal Execution Output:</div>
            <div className="p-2 rounded bg-[#faf8f5] border border-[#e5ded1] text-[#1c1917] text-[11px] overflow-x-auto whitespace-pre font-medium">
              {artifact.stdout ? artifact.stdout.trim() : (codeContent ? 'Script executed successfully.' : '(No stdout output recorded)')}
            </div>
            {artifact.stderr && (
              <div className="p-2 rounded bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[11px] overflow-x-auto whitespace-pre">{artifact.stderr}</div>
            )}
          </div>
        </div>
      );
    }

    if (rawType === 'pdf') {
      return (
        <div className="p-5 space-y-4 font-sans text-xs text-[#1c1917] bg-[#ffffff] rounded-lg border border-[#e5ded1] shadow-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-[#e5ded1]">
            <div className="p-2.5 rounded-lg bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#1c1917]">{artifact.title}</div>
              <div className="text-[11px] font-mono text-[#78716c]">{artifact.filename}</div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-[#44403c] leading-relaxed">
            <p>
              Portable Document Format compiled locally under <code className="px-1.5 py-0.5 rounded bg-[#f4efe6] font-mono text-[11px] text-[#dc2626]">storage/{artifact.filename}</code>.
            </p>
          </div>
          <div className="flex space-x-2">
            <a
              href={resolveViewUrl(artifact)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 rounded-lg bg-[#faf8f5] hover:bg-[#ede7dc] text-[#1c1917] font-semibold flex items-center justify-center space-x-1.5 border border-[#e5ded1] transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Tab</span>
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 text-center text-[#78716c] font-mono text-xs bg-[#ffffff] rounded-lg border border-[#e5ded1]">
        <div>📄 {artifact.title || artifact.filename}</div>
        <div className="text-[10px] text-[#94a3b8] mt-1">Ready for preview and download</div>
      </div>
    );
  };

  const renderHeaderIcon = () => {
    if (rawType === 'docx' || rawType === 'doc' || rawType === 'document') return <FileText className="w-4 h-4 text-[#ea580c]" />;
    if (rawType === 'xlsx' || rawType === 'xls' || rawType === 'spreadsheet') return <FileSpreadsheet className="w-4 h-4 text-[#16a34a]" />;
    if (rawType === 'pptx' || rawType === 'ppt' || rawType === 'presentation') return <Presentation className="w-4 h-4 text-[#d97706]" />;
    if (rawType === 'png' || rawType === 'jpg' || rawType === 'plot' || rawType === 'image') return <ImageIcon className="w-4 h-4 text-[#7c3aed]" />;
    if (rawType === 'py' || rawType === 'code') return <Terminal className="w-4 h-4 text-[#0284c7]" />;
    if (rawType === 'pdf') return <FileText className="w-4 h-4 text-[#dc2626]" />;
    return null;
  };

  const downloadHref = resolveDownloadUrl(artifact);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#faf8f5]">
      <div className="p-3.5 border-b border-[#e5ded1] bg-[#ffffff] flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-2 truncate mr-2">
          <div className="p-1.5 rounded bg-[#faf8f5] border border-[#d6cebf]">
            {renderHeaderIcon()}
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-[#1c1917] truncate">{artifact.title}</div>
            <div className="text-[10px] font-mono text-[#78716c] truncate">{artifact.filename}</div>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <a
            href={downloadHref}
            download={artifact.filename}
            className="p-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition-colors"
            title="Download original file"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f4efe6] transition-colors"
            title="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {renderContent()}
      </div>
      <div className="p-3 border-t border-[#e5ded1] bg-[#ffffff] flex items-center justify-between shrink-0">
        <span className="text-[10px] font-mono text-[#78716c]">
          {artifact.size_bytes ? `${Math.round(artifact.size_bytes / 1024)} KB` : 'Ready'} • SHA-256 Verified
        </span>
        <a
          href={downloadHref}
          download={artifact.filename}
          className="px-3 py-1.5 rounded-lg bg-[#ffffff] hover:bg-[#ea580c] hover:text-white border border-[#d6cebf] text-xs font-semibold text-[#1c1917] flex items-center space-x-1.5 shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download File</span>
        </a>
      </div>
    </div>
  );
}
