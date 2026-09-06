import {
  Cpu, Plus, RefreshCw, CheckCircle2, X
} from 'lucide-react';

export default function ModelSettingsModal({
  healthData,
  models,
  onSelectModel,
  onRefreshHealth,
  fetchModels,
  onClose,
  modelRegistryTab,
  setModelRegistryTab,
  newModelId,
  setNewModelId,
  newModelName,
  setNewModelName,
  newModelCapabilities,
  newModelDefault,
  setNewModelDefault,
  isRegisteringModel,
  modelRegisterSuccess,
  onRegisterModel,
  onToggleCapability,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#d6cebf] rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 text-xs font-mono text-[#1c1917] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#e5ded1] pb-3 shrink-0">
          <div className="flex items-center space-x-2 font-bold text-[#1c1917]">
            <Cpu className="w-4 h-4 text-[#ea580c]" />
            <span>MODEL REGISTRY & CAPABILITIES (model.yaml)</span>
          </div>
          <button onClick={onClose} className="text-[#78716c] hover:text-[#1c1917]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-[#e5ded1] gap-4 shrink-0 font-sans">
          <button
            onClick={() => setModelRegistryTab('list')}
            className={`pb-2 text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              modelRegistryTab === 'list'
                ? 'border-b-2 border-[#ea580c] text-[#ea580c]'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Configured Models ({models?.length || 1})</span>
          </button>
          <button
            onClick={() => setModelRegistryTab('register')}
            className={`pb-2 text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              modelRegistryTab === 'register'
                ? 'border-b-2 border-[#ea580c] text-[#ea580c]'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Model to YAML</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {modelRegisterSuccess && (
            <div className="p-3 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] flex items-center space-x-2 font-sans text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{modelRegisterSuccess}</span>
            </div>
          )}

          {modelRegistryTab === 'list' ? (
            <div className="space-y-3 font-sans">
              <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5ded1] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${healthData?.ollama_backend?.available ? 'bg-[#16a34a] animate-pulse' : 'bg-[#ea580c]'}`} />
                  <div>
                    <div className="font-semibold text-[#1c1917]">
                      {healthData?.ollama_backend?.available ? 'Ollama Daemon Active' : 'Ollama Daemon Offline'}
                    </div>
                    <div className="text-[11px] text-[#78716c] font-mono">
                      Active Model: <strong className="text-[#ea580c]">{healthData?.active_foundation_model || healthData?.active_model_id || 'gemma3:4b'}</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { onRefreshHealth(); fetchModels(); }}
                  className="px-2.5 py-1 rounded bg-[#ffffff] border border-[#d6cebf] hover:bg-[#f4efe6] text-[11px] font-mono flex items-center space-x-1 text-[#44403c]"
                  title="Refresh models list"
                >
                  <RefreshCw className="w-3 h-3 text-[#ea580c]" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#78716c] uppercase tracking-wider font-mono">
                  Models in model.yaml:
                </div>
                {models && models.length > 0 ? (
                  models.map((m) => {
                    const mId = m.id || m.model_id;
                    const isCurrentActive = healthData?.active_model_id === mId || healthData?.active_foundation_model === mId;
                    return (
                      <div
                        key={mId}
                        className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                          isCurrentActive
                            ? 'bg-[#fff7ed]/50 border-[#ea580c] shadow-xs'
                            : 'bg-[#ffffff] border-[#e5ded1] hover:border-[#d6cebf]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="font-bold text-xs text-[#1c1917]">{m.name || mId}</div>
                            <code className="px-1.5 py-0.5 rounded bg-[#f4efe6] text-[#78716c] text-[10px] font-mono border border-[#e5ded1]">
                              {mId}
                            </code>
                            {m.default && (
                              <span className="px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#16a34a] text-[10px] font-mono font-bold border border-[#bbf7d0]">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onSelectModel(mId)}
                            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                              isCurrentActive
                                ? 'bg-[#ea580c] text-white font-bold'
                                : 'bg-[#faf8f5] hover:bg-[#ede7dc] text-[#44403c] border border-[#d6cebf]'
                            }`}
                          >
                            {isCurrentActive ? 'Active' : 'Select'}
                          </button>
                        </div>
                        {m.capabilities && m.capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {m.capabilities.map((cap) => (
                              <span
                                key={cap}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#f4efe6] text-[#44403c] border border-[#e5ded1]"
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-[#78716c] text-xs bg-[#faf8f5] rounded-xl border border-[#e5ded1]">
                    No models loaded from model.yaml.
                  </div>
                )}
              </div>

              {healthData?.ollama_backend?.models && healthData.ollama_backend.models.length > 0 && (
                <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e5ded1] space-y-1.5 font-sans">
                  <div className="text-[10px] font-mono uppercase font-bold text-[#78716c]">
                    Detected in Local Ollama (/api/tags):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {healthData.ollama_backend.models.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onSelectModel(tag)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#ffffff] hover:border-[#ea580c] border border-[#d6cebf] text-[#44403c] transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={onRegisterModel} className="space-y-4 font-sans text-xs">
              {healthData?.ollama_backend?.models && healthData.ollama_backend.models.length > 0 && (
                <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e5ded1] space-y-1.5">
                  <div className="text-[10px] font-mono uppercase font-bold text-[#78716c]">
                    Quick Fill from Installed Ollama Models:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {healthData.ollama_backend.models.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => {
                          setNewModelId(tag);
                          if (!newModelName) setNewModelName(tag.charAt(0).toUpperCase() + tag.slice(1).replace(':', ' '));
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#ffffff] hover:border-[#ea580c] hover:text-[#ea580c] border border-[#d6cebf] text-[#44403c] transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-[#1c1917] block">
                  Model ID / Tag <span className="text-[#ea580c]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. deepseek-r1:8b, mistral:7b, llama3:8b"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#faf8f5] border border-[#d6cebf] font-mono text-xs text-[#1c1917] focus:outline-none focus:border-[#ea580c]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#1c1917] block">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. DeepSeek R1 Math Specialist"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#faf8f5] border border-[#d6cebf] text-xs text-[#1c1917] focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-[#1c1917] block">
                  Assign Task Capabilities (For Intent Router Auto-Selection):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'ENGINEERING_MATH_AND_CODE', label: 'Math & Python Code Simulation' },
                    { id: 'STANDARDS_AND_GOVERNANCE_REASONING', label: 'Plant Standards (API/ASME/GFR)' },
                    { id: 'ENTERPRISE_DELIVERABLE_SYNTHESIS', label: 'Word / Excel / PPT Deliverables' },
                    { id: 'MULTIMODAL_IMAGE_INSPECTION', label: 'Multimodal Vision & P&ID Scans' },
                    { id: 'DOCUMENT_RAG_ANALYSIS', label: 'Knowledge Base Document Search' },
                    { id: 'GENERAL_ENGINEERING_REASONING', label: 'General Technical Reasoning' },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        newModelCapabilities.includes(item.id)
                          ? 'bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]'
                          : 'bg-[#faf8f5] border-[#e5ded1] text-[#44403c] hover:border-[#d6cebf]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newModelCapabilities.includes(item.id)}
                        onChange={() => onToggleCapability(item.id)}
                        className="rounded text-[#ea580c] focus:ring-[#ea580c]"
                      />
                      <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultCheckbox"
                  checked={newModelDefault}
                  onChange={(e) => setNewModelDefault(e.target.checked)}
                  className="rounded text-[#ea580c] focus:ring-[#ea580c]"
                />
                <label htmlFor="defaultCheckbox" className="text-xs text-[#44403c] cursor-pointer">
                  Set as Default Model in <code className="font-mono text-[#ea580c]">model.yaml</code>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isRegisteringModel || !newModelId.trim()}
                  className="px-4 py-2 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-xs flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  {isRegisteringModel ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to YAML...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Model to model.yaml</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
