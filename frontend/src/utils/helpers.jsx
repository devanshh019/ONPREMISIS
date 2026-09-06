import {
  FileText, FileSpreadsheet, Presentation, Image as ImageIcon,
  Terminal, Download
} from 'lucide-react';

export function getArtifactIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'docx' || t === 'doc' || t === 'document') return <FileText className="w-4 h-4 text-[#ea580c]" />;
  if (t === 'xlsx' || t === 'xls' || t === 'spreadsheet') return <FileSpreadsheet className="w-4 h-4 text-[#16a34a]" />;
  if (t === 'pptx' || t === 'ppt' || t === 'presentation') return <Presentation className="w-4 h-4 text-[#d97706]" />;
  if (t === 'png' || t === 'jpg' || t === 'jpeg' || t === 'plot' || t === 'image') return <ImageIcon className="w-4 h-4 text-[#7c3aed]" />;
  if (t === 'py' || t === 'code') return <Terminal className="w-4 h-4 text-[#0284c7]" />;
  if (t === 'pdf') return <FileText className="w-4 h-4 text-[#dc2626]" />;
  return <Download className="w-4 h-4 text-[#57534e]" />;
}

export function classifyTaskType(query, uploadedAttachments = []) {
  const promptLower = query.toLowerCase();

  if (uploadedAttachments.length > 0) {
    return {
      taskType: "Multimodal Document & Attachment Processing",
      targetAction: `Processing ${uploadedAttachments.length} attachment(s) with local foundation model`
    };
  }

  if (promptLower.includes("powerpoint") || promptLower.includes("ppt") || promptLower.includes("slide") || promptLower.includes("deck") || promptLower.includes("presentation")) {
    return { taskType: "PowerPoint Presentation Generation", targetAction: "Structuring slide outline & generating .pptx deck" };
  }
  if (promptLower.includes("word") || promptLower.includes("docx") || promptLower.includes("report") || promptLower.includes("approval note")) {
    return { taskType: "Word Document Compilation", targetAction: "Drafting executive note & compiling .docx deliverable" };
  }
  if (promptLower.includes("excel") || promptLower.includes("xlsx") || promptLower.includes("spreadsheet") || promptLower.includes("workbook")) {
    return { taskType: "Excel Spreadsheet Calculation", targetAction: "Building spreadsheet formulas & compiling .xlsx file" };
  }
  if (promptLower.includes("differentiate") || promptLower.includes("integral") || promptLower.includes("calculus") || promptLower.includes("sympy") || promptLower.includes("solve")) {
    return { taskType: "Mathematical Sandbox Evaluation", targetAction: "Evaluating calculus with local Python SymPy engine in sandbox" };
  }
  if (promptLower.includes("simulate") || promptLower.includes("heat exchanger") || promptLower.includes("lmtd")) {
    return { taskType: "Thermal Process Simulation", targetAction: "Simulating LMTD equations & generating matplotlib thermal plot" };
  }
  if (promptLower.includes("p&id") || promptLower.includes("drawing") || promptLower.includes("schematic")) {
    return { taskType: "P&ID Schematic Vision Inspection", targetAction: "Analyzing coordinates & auditing safety interlocks" };
  }
  if (promptLower.includes("api") || promptLower.includes("asme") || promptLower.includes("standard") || promptLower.includes("gfr")) {
    return { taskType: "Plant Standards Local Search", targetAction: "Searching local RAG knowledge base & standards" };
  }

  return {
    taskType: "Neural Reasoning & Response Synthesis",
    targetAction: "Querying local model on localhost (127.0.0.1:11434)..."
  };
}
