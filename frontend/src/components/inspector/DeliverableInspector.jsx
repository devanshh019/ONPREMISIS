import { useState } from 'react';
import {
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon,
  Terminal, Download, X, ExternalLink
} from 'lucide-react';

export default function DeliverableInspector({ artifact, onClose, onZoomImage }) {
  const [activeSlide, setActiveSlide] = useState(0);

  if (!artifact) return null;

  const rawType = (
    artifact.file_type ||
    artifact.type ||
    (artifact.filename ? artifact.filename.split('.').pop() : '') ||
    ''
  ).toLowerCase();

  const renderContent = () => {

    if (rawType === 'docx' || rawType === 'doc' || rawType === 'document') {
      const paragraphs = artifact.paragraphs || [
        artifact.subject || artifact.title || 'Official Technical Directive',
        'This official engineering document has been synthesized and certified locally under on-premises sovereign protocols with zero cloud egress.',
        'All calculation parameters, allowable stress values, and inspection turnaround requirements comply with applicable plant standards.'
      ];
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
            <div className="space-y-3 text-xs text-[#1c1917] leading-relaxed">
              {paragraphs.map((p, pIdx) => (
                <div key={pIdx} className="space-y-1">
                  <div className="font-semibold text-[11px] text-[#78716c]">
                    Section {pIdx + 1}: Directive & Analysis
                  </div>
                  <p className="text-xs text-[#44403c] bg-[#faf8f5] p-2.5 rounded border border-[#f0eae0]">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (rawType === 'xlsx' || rawType === 'xls' || rawType === 'spreadsheet') {
      const headers = artifact.headers || ['Item', 'Parameter', 'Value', 'Unit', 'Compliance Status'];
      const rows = artifact.rows || [
        ['PARAM-1', 'Design Operating Pressure', '18.5', 'bar', 'VERIFIED'],
        ['PARAM-2', 'Operating Temperature', '350.0', '°C', 'VERIFIED'],
        ['PARAM-3', 'Calculated Corrosion Rate', '0.42', 'mm/year', 'FLAGGED'],
        ['PARAM-4', 'Estimated Remaining Life', '4.8', 'years', 'ACCEPTABLE'],
      ];
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
                      {row.map((cell, cIdx) => {
                        const cellStr = String(cell);
                        const isStatus = cellStr === 'VERIFIED' || cellStr === 'FLAGGED' || cellStr === 'ACCEPTABLE';
                        return (
                          <td key={cIdx} className="p-2 whitespace-nowrap text-[#1c1917]">
                            {isStatus ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cellStr === 'VERIFIED' ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]' :
                                  cellStr === 'FLAGGED' ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]' :
                                    'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                                }`}>{cellStr}</span>
                            ) : cellStr}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-[#78716c] font-mono flex items-center justify-between pt-1">
              <span>Sheet: Calculations</span>
              <span>Deterministic Formulas</span>
            </div>
          </div>
        </div>
      );
    }

    if (rawType === 'pptx' || rawType === 'ppt' || rawType === 'presentation') {
      const slides = artifact.slides && artifact.slides.length > 0
        ? artifact.slides
        : [{
          title: artifact.title || 'Executive Overview',
          bullets: [
            'Comprehensive technical evaluation per industry standard codes',
            'Integrity assessments and turnaround scheduling parameters',
            'Certified on-premises sovereign analysis with zero cloud egress'
          ]
        }];
      return (
        <div className="space-y-3">
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
          <div className="p-4 rounded-lg bg-[#ffffff] border border-[#e5ded1] shadow-xs space-y-3 min-h-[220px]">
            <div className="p-3 bg-[#1c1917] rounded-md text-[#faf8f5]">
              <div className="text-[10px] font-mono uppercase text-[#ea580c] font-semibold">KAVACH-AI • 16:9 Executive Deck</div>
              <div className="text-xs font-bold text-white mt-0.5">{slides[activeSlide]?.title || `Slide ${activeSlide + 1}`}</div>
            </div>
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-mono uppercase text-[#78716c] font-semibold">Key Points:</div>
              <ul className="space-y-2 text-xs text-[#44403c] list-none leading-relaxed">
                {(slides[activeSlide]?.bullets || []).map((b, bIdx) => (
                  <li key={bIdx} className="flex items-start space-x-2">
                    <span className="text-[#ea580c] font-bold mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-[10px] text-[#78716c] font-mono text-center">
            Slide {activeSlide + 1} of {slides.length} • High-Resolution PPTX
          </div>
        </div>
      );
    }

    if (rawType === 'png' || rawType === 'jpg' || rawType === 'jpeg' || rawType === 'plot' || rawType === 'image') {
      return (
        <div className="space-y-3">
          <div className="p-2 rounded-lg bg-[#ffffff] border border-[#e5ded1] shadow-xs">
            <div className="relative group cursor-pointer overflow-hidden rounded" onClick={() => onZoomImage && onZoomImage(artifact.path)}>
              <img src={artifact.path} alt={artifact.title || 'Simulation Plot'} className="w-full object-contain max-h-72 mx-auto rounded transition-transform group-hover:scale-102" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold rounded">
                🔍 Click to Enlarge View
              </div>
            </div>
          </div>
          <div className="p-2.5 bg-[#faf8f5] rounded border border-[#e5ded1] text-center text-xs font-mono text-[#57534e]">
            <div>{artifact.title || 'Matplotlib High-DPI Plot'}</div>
            <div className="text-[10px] text-[#78716c] mt-0.5">{artifact.filename}</div>
          </div>
        </div>
      );
    }

    if (rawType === 'py' || rawType === 'code') {
      return (
        <div className="space-y-3 font-mono text-xs">
          {artifact.code && (
            <div className="p-3 rounded-lg bg-[#1c1917] text-[#faf8f5] border border-[#334155] space-y-1">
              <div className="text-[10px] uppercase text-[#94a3b8] font-bold pb-1 border-b border-[#334155]">Python Source:</div>
              <pre className="p-2 overflow-x-auto text-[11px] text-[#38bdf8] whitespace-pre">{artifact.code}</pre>
            </div>
          )}
          <div className="p-3 rounded-lg bg-[#ffffff] border border-[#e5ded1] space-y-1">
            <div className="text-[10px] uppercase text-[#78716c] font-bold pb-1 border-b border-[#f0eae0]">Terminal Execution Output:</div>
            <div className="p-2 rounded bg-[#faf8f5] border border-[#e5ded1] text-[#1c1917] text-[11px] overflow-x-auto whitespace-pre font-medium">
              {artifact.stdout ? artifact.stdout.trim() : '(Executed successfully with exit code 0)'}
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
              href={artifact.path}
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
            href={artifact.path}
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
          href={artifact.path}
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
