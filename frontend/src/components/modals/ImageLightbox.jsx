import { X } from 'lucide-react';

export default function ImageLightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  const resolvedUrl = imageUrl && !imageUrl.startsWith('/api/') && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')
    ? `/api/artifacts/${imageUrl.split('/').pop()}`
    : imageUrl;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-[#ffffff] p-2 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black text-white transition-colors"
          title="Close image"
        >
          <X className="w-4 h-4" />
        </button>
        <img
          src={resolvedUrl}
          alt="Expanded visualization"
          className="max-h-[85vh] max-w-full object-contain rounded"
          onError={(e) => {
            const fn = imageUrl.split('/').pop();
            if (fn && !e.target.src.includes(`/api/artifacts/${fn}`)) {
              e.target.src = `/api/artifacts/${fn}`;
            }
          }}
        />
      </div>
    </div>
  );
}
