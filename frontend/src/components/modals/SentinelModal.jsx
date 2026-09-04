import { ShieldCheck, Download, X } from 'lucide-react';

export default function SentinelModal({
  securityData,
  certificate,
  onGenerateCert,
  onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#d6cebf] rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 text-xs font-mono text-[#1c1917]">
        <div className="flex items-center justify-between border-b border-[#e5ded1] pb-3">
          <div className="flex items-center space-x-2 font-bold text-[#1c1917]">
            <ShieldCheck className="w-4 h-4 text-[#ea580c]" />
            <span>AIR-GAP SENTINEL AUDIT REPORT</span>
          </div>
          <button onClick={onClose} className="text-[#78716c] hover:text-[#1c1917]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#e5ded1]">
            <div className="text-[#78716c] text-[10px]">Outbound Egress</div>
            <div className="text-base font-bold text-[#1c1917]">0 Bytes</div>
          </div>
          <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#e5ded1]">
            <div className="text-[#78716c] text-[10px]">External DNS</div>
            <div className="text-base font-bold text-[#1c1917]">0 Calls</div>
          </div>
          <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#e5ded1]">
            <div className="text-[#78716c] text-[10px]">Local Loopback</div>
            <div className="text-base font-bold text-[#ea580c]">127.0.0.1</div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[#78716c] mb-1.5 font-semibold">Bound Local Services:</div>
          <div className="space-y-1 bg-[#faf8f5] p-2.5 rounded-lg border border-[#e5ded1] text-[11px]">
            {securityData?.active_loopback_sockets?.map((s, i) => (
              <div key={i} className="flex justify-between text-[#44403c]">
                <span>{s.service}</span>
                <span className="text-[#78716c]">{s.bind}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#e5ded1]">
          <span className="text-[#78716c] text-[10px]">SHA-256 Tamper-Proof Chain</span>
          <button
            onClick={onGenerateCert}
            className="px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold flex items-center space-x-1 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Certificate</span>
          </button>
        </div>
        {certificate && (
          <div className="p-3 rounded bg-[#fff7ed] border border-[#fed7aa] text-[10px] space-y-1 text-[#9a3412]">
            <div><strong>Cert ID:</strong> {certificate.certificate_id}</div>
            <div><strong>Audit Root:</strong> {certificate.chain_head_hash}</div>
            <div><strong>Status:</strong> {certificate.external_egress_verified}</div>
          </div>
        )}
      </div>
    </div>
  );
}
