import { FileText, Eye, X } from 'lucide-react';
import { getArtifactIcon } from '../../utils/helpers';

export default function DeliverablesModal({
  allArtifacts,
  onSelectDeliverable,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#d6cebf] rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 text-xs text-[#1c1917]">
        <div className="flex items-center justify-between border-b border-[#e5ded1] pb-3">
          <div className="flex items-center space-x-2 font-bold text-[#1c1917]">
            <FileText className="w-4 h-4 text-[#ea580c]" />
            <span>GENERATED INDUSTRIAL DELIVERABLES</span>
          </div>
          <button onClick={onClose} className="text-[#78716c] hover:text-[#1c1917]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {allArtifacts.length === 0 ? (
            <div className="p-8 text-center text-[#78716c] font-mono">
              No deliverables generated yet. Run a workflow to create Word, Excel, or PowerPoint files.
            </div>
          ) : (
            allArtifacts.map((art, idx) => (
              <div
                key={idx}
                onClick={() => onSelectDeliverable(art)}
                className="flex items-center justify-between p-3 rounded-lg bg-[#faf8f5] hover:bg-[#ffffff] border border-[#e5ded1] hover:border-[#ea580c] cursor-pointer transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded bg-[#ffffff] border border-[#d6cebf] group-hover:scale-105 transition-transform">
                    {getArtifactIcon(art.file_type)}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1c1917] group-hover:text-[#ea580c] transition-colors">{art.title}</div>
                    <div className="text-[10px] font-mono text-[#78716c]">{art.filename}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-[#ea580c] font-semibold flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
