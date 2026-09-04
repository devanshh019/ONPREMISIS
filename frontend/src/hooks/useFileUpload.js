import { useState, useRef } from 'react';

export default function useFileUpload() {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    handleFilesAdd(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilesAdd = (files) => {
    const newItems = files.map(f => {
      const isImg = f.type.startsWith('image/');
      return {
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        preview: isImg ? URL.createObjectURL(f) : null
      };
    });
    setAttachedFiles(prev => [...prev, ...newItems]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachedFiles(prev => {
      const item = prev[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAttachments = () => {
    setAttachedFiles([]);
  };

  return {
    attachedFiles,
    isDragging,
    setIsDragging,
    fileInputRef,
    handleFileSelect,
    handleFilesAdd,
    handleRemoveAttachment,
    clearAttachments,
  };
}
