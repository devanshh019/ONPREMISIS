import { useState, useEffect } from 'react';
import useChatSessions from './hooks/useChatSessions';
import useApi from './hooks/useApi';
import useFileUpload from './hooks/useFileUpload';
import Header from './components/layout/Header';
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import ChatInput from './components/chat/ChatInput';
import DeliverableInspector from './components/inspector/DeliverableInspector';
import SentinelModal from './components/modals/SentinelModal';
import DeliverablesModal from './components/modals/DeliverablesModal';
import KnowledgeBaseModal from './components/modals/KnowledgeBaseModal';
import ModelSettingsModal from './components/modals/ModelSettingsModal';
import ImageLightbox from './components/modals/ImageLightbox';
import { FileText } from 'lucide-react';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const [prompt, setPrompt] = useState('');
  const [loadingSessionId, setLoadingSessionId] = useState(null);
  const loading = !!loadingSessionId;
  const [activeTaskMeta, setActiveTaskMeta] = useState(null);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  const chatSessions = useChatSessions();
  const api = useApi();
  const fileUpload = useFileUpload();

  const { currentSession, messages, currentSessionId } = chatSessions;
  const isCurrentSessionLoading = loadingSessionId === currentSession?.id;

  useEffect(() => {
    let interval = null;
    if (loadingSessionId) {
      setElapsedTimer(0);
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedTimer(parseFloat(((Date.now() - start) / 1000).toFixed(1)));
      }, 100);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [loadingSessionId]);

  const allArtifacts = messages
    .filter(m => m.artifacts && m.artifacts.length > 0)
    .flatMap(m => m.artifacts);

  const handleSend = async (textToSend) => {
    const query = textToSend || prompt;
    if ((!query.trim() && fileUpload.attachedFiles.length === 0) || loadingSessionId) return;

    const targetSessionId = currentSessionId;
    const filesToUpload = [...fileUpload.attachedFiles];
    fileUpload.clearAttachments();

    let uploadedAttachments = [];
    for (const item of filesToUpload) {
      const formData = new FormData();
      formData.append('file', item.file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) uploadedAttachments.push(await res.json());
      } catch (err) {
        console.error("Attachment upload error:", err);
      }
    }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: query || '',
      attachments: uploadedAttachments,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const isFirstMsg = messages.length === 0;
    const newTitle = isFirstMsg
      ? (query.length > 28 ? query.slice(0, 28) + '...' : (query || uploadedAttachments[0]?.filename || 'File Task'))
      : currentSession.title;

    if (isFirstMsg) chatSessions.updateSessionTitle(targetSessionId, newTitle);
    chatSessions.addMessageToSession(targetSessionId, userMsg);

    let predictedModel = api.healthData?.active_foundation_model || api.healthData?.active_model_id || "Local Model";
    let predictedCategory = "GENERAL_ENGINEERING_REASONING";
    let isFallback = false;
    let activeModelTag = predictedModel;
    let requestedModelTag = predictedModel;
    let fallbackMsg = null;

    try {
      const routeRes = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, attachments: uploadedAttachments })
      });
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        if (routeData.model_name) predictedModel = routeData.model_name;
        if (routeData.task_category) predictedCategory = routeData.task_category;
        isFallback = !!routeData.is_fallback;
        activeModelTag = routeData.active_model || predictedModel;
        requestedModelTag = routeData.requested_model || routeData.selected_model_id || predictedModel;
        fallbackMsg = routeData.fallback_message;

        const headerDisplay = isFallback
          ? `${activeModelTag} (Fallback from ${requestedModelTag})`
          : predictedModel;

        api.setHealthData(prev => prev ? {
          ...prev,
          active_foundation_model: headerDisplay,
          active_model_id: activeModelTag,
          is_fallback: isFallback,
          fallback_message: fallbackMsg
        } : prev);
      }
    } catch (e) {}

    setActiveTaskMeta({
      taskType: predictedCategory,
      targetAction: isFallback
        ? `Executing on fallback ${activeModelTag}`
        : `Executing task with ${predictedModel}`,
      model: predictedModel,
      activeModel: activeModelTag,
      requestedModel: requestedModelTag,
      isFallback,
      fallbackMessage: fallbackMsg,
      endpoint: api.healthData?.ollama_backend?.endpoint || "http://127.0.0.1:11434",
      networkEgress: "0 Bytes (Air-Gapped)"
    });

    setPrompt('');
    setLoadingSessionId(targetSessionId);
    setThinkingExpanded(false);

    const targetSession = chatSessions.sessions.find(s => s.id === targetSessionId);
    const targetMessages = targetSession ? targetSession.messages : [];
    const historyPayload = targetMessages
      .filter(m => !m.isError && m.content !== query && !m.content.startsWith('Execution Notice:'))
      .map(m => ({ role: m.role, content: m.content }));

    fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: query || "Analyze attached file(s) and provide technical assessment.",
        attachments: uploadedAttachments,
        history: historyPayload
      })
    })
      .then(res => res.json())
      .then(data => {
        const assistantMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.summary,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          routing: data.routing,
          fallback: data.fallback,
          is_fallback: data.is_fallback,
          requested_model: data.requested_model,
          active_model: data.active_model,
          steps: data.steps,
          citations: data.citations,
          artifacts: data.artifacts,
          sandbox_output: data.sandbox_output,
          scratchpad: data.scratchpad,
          sovereign_proof: data.sovereign_proof,
          elapsed_seconds: data.elapsed_seconds
        };

        if (targetSessionId === currentSessionId && data.artifacts && data.artifacts.length > 0) {
          setSelectedDeliverable(data.artifacts[0]);
          setRightPanelOpen(true);
        }

        if (data.routing && data.routing.model_name) {
          const displayModel = data.is_fallback && data.active_model
            ? `${data.active_model} (Fallback)`
            : data.routing.model_name;
          api.setHealthData(prev => prev ? {
            ...prev,
            active_foundation_model: displayModel,
            active_model_id: data.active_model || data.routing.selected_model_id || prev.active_model_id,
          } : prev);
        }

        chatSessions.addMessageToSession(targetSessionId, assistantMsg);
        api.fetchSecurityData();
      })
      .catch(err => {
        chatSessions.addMessageToSession(targetSessionId, {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Execution Notice: Local sovereign backend error (${err.message}). Ensure 127.0.0.1:8000 is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        });
      })
      .finally(() => {
        setLoadingSessionId(null);
      });
  };

  const handleSelectDeliverable = (art) => {
    setSelectedDeliverable(art);
    setRightPanelOpen(true);
  };

  return (
    <div className="flex h-screen bg-[#faf8f5] text-[#1c1917] font-sans overflow-hidden">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sessions={chatSessions.sessions}
        currentSessionId={currentSessionId}
        loadingSessionId={loadingSessionId}
        loading={loading}
        healthData={api.healthData}
        allArtifactsCount={allArtifacts.length}
        onNewChat={() => { chatSessions.handleNewChat(); setPrompt(''); setSelectedDeliverable(null); }}
        onSelectSession={(id) => { chatSessions.setCurrentSessionId(id); setSelectedDeliverable(null); }}
        onDeleteSession={chatSessions.handleDeleteSession}
        onOpenModal={setActiveModal}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#faf8f5] relative">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          rightPanelOpen={rightPanelOpen}
          setRightPanelOpen={setRightPanelOpen}
          healthData={api.healthData}
          allArtifactsCount={allArtifacts.length}
          selectedDeliverable={selectedDeliverable}
          onOpenModal={setActiveModal}
        />

        <ChatArea
          messages={messages}
          scenarios={api.scenarios}
          isCurrentSessionLoading={isCurrentSessionLoading}
          elapsedTimer={elapsedTimer}
          thinkingExpanded={thinkingExpanded}
          setThinkingExpanded={setThinkingExpanded}
          activeTaskMeta={activeTaskMeta}
          selectedDeliverable={selectedDeliverable}
          onSelectDeliverable={handleSelectDeliverable}
          onSend={handleSend}
          loading={loading}
          healthData={api.healthData}
          onExpandImage={(imgUrl) => setExpandedImage(imgUrl)}
          currentSessionId={currentSessionId}
        />

        <ChatInput
          prompt={prompt}
          setPrompt={setPrompt}
          loading={loading}
          healthData={api.healthData}
          attachedFiles={fileUpload.attachedFiles}
          isDragging={fileUpload.isDragging}
          setIsDragging={fileUpload.setIsDragging}
          fileInputRef={fileUpload.fileInputRef}
          onSubmit={() => handleSend()}
          onFileSelect={fileUpload.handleFileSelect}
          onFilesAdd={fileUpload.handleFilesAdd}
          onRemoveAttachment={fileUpload.handleRemoveAttachment}
        />
      </div>

      <aside
        className={`${rightPanelOpen ? 'w-80 md:w-96' : 'w-0 translate-x-full'
        } transition-all duration-300 ease-in-out bg-[#f4efe6] border-l border-[#e5ded1] shrink-0 z-30 overflow-hidden flex flex-col`}
      >
        {selectedDeliverable ? (
          <DeliverableInspector
            artifact={selectedDeliverable}
            onClose={() => setSelectedDeliverable(null)}
            onZoomImage={(imgUrl) => setExpandedImage(imgUrl)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#78716c]">
            <div className="w-12 h-12 rounded-xl bg-[#ede7dc] flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-[#a8a29e]" />
            </div>
            <div className="font-semibold text-xs text-[#1c1917] mb-1">Deliverables Inspector</div>
            <p className="text-[11px] leading-relaxed max-w-xs text-[#78716c]">
              Select any generated PowerPoint deck, Word document, or Excel spreadsheet from the chat to inspect its live slides, tables, or sections here.
            </p>
          </div>
        )}
      </aside>

      {activeModal === 'sentinel' && (
        <SentinelModal
          securityData={api.securityData}
          certificate={api.certificate}
          onGenerateCert={api.handleGenerateCert}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'deliverables' && (
        <DeliverablesModal
          allArtifacts={allArtifacts}
          onSelectDeliverable={(art) => { handleSelectDeliverable(art); setActiveModal(null); }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'kb' && (
        <KnowledgeBaseModal
          kbTab={api.kbTab}
          setKbTab={api.setKbTab}
          kbQuery={api.kbQuery}
          setKbQuery={api.setKbQuery}
          kbResults={api.kbResults}
          kbDocuments={api.kbDocuments}
          kbUploadLoading={api.kbUploadLoading}
          kbFileInputRef={api.kbFileInputRef}
          onKbSearch={api.handleKbSearch}
          onKbUpload={api.handleKbUpload}
          onKbDelete={api.handleKbDelete}
          onFetchKbDocuments={api.fetchKbDocuments}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'models' && (
        <ModelSettingsModal
          healthData={api.healthData}
          models={api.models}
          onSelectModel={api.handleSelectModel}
          onRefreshHealth={api.fetchHealth}
          fetchModels={api.fetchModels}
          onClose={() => setActiveModal(null)}
          modelRegistryTab={api.modelRegistryTab}
          setModelRegistryTab={api.setModelRegistryTab}
          newModelId={api.newModelId}
          setNewModelId={api.setNewModelId}
          newModelName={api.newModelName}
          setNewModelName={api.setNewModelName}
          newModelCapabilities={api.newModelCapabilities}
          newModelDefault={api.newModelDefault}
          setNewModelDefault={api.setNewModelDefault}
          isRegisteringModel={api.isRegisteringModel}
          modelRegisterSuccess={api.modelRegisterSuccess}
          onRegisterModel={api.handleRegisterModel}
          onToggleCapability={api.toggleCapability}
        />
      )}

      <ImageLightbox
        imageUrl={expandedImage}
        onClose={() => setExpandedImage(null)}
      />
    </div>
  );
}
