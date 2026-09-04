import { useState, useEffect } from 'react';
import useChatSessions from './hooks/useChatSessions';
import useApi from './hooks/useApi';
import useFileUpload from './hooks/useFileUpload';
import { classifyTaskType } from './utils/helpers';
import Header from './components/layout/Header';
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import ChatInput from './components/chat/ChatInput';
import DeliverableInspector from './components/inspector/DeliverableInspector';
import VoiceOrb from './components/VoiceOrb';
import SentinelModal from './components/modals/SentinelModal';
import DeliverablesModal from './components/modals/DeliverablesModal';
import KnowledgeBaseModal from './components/modals/KnowledgeBaseModal';
import ModelSettingsModal from './components/modals/ModelSettingsModal';
import ImageLightbox from './components/modals/ImageLightbox';


export default function App() {

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
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
      } catch (err) { console.error("Attachment upload error:", err); }
    }


    const userContent = query || (uploadedAttachments.length > 0 ? `Uploaded ${uploadedAttachments.length} file(s): ${uploadedAttachments.map(a => a.filename).join(', ')}` : '');
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userContent,
      attachments: uploadedAttachments,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (messages.length === 0) {
      chatSessions.updateSessionTitle(targetSessionId, query.length > 28 ? query.slice(0, 28) + '...' : (query || uploadedAttachments[0]?.filename || 'File Task'));
    }
    chatSessions.addMessageToSession(targetSessionId, userMsg);


    const { taskType, targetAction } = classifyTaskType(query, uploadedAttachments);
    const activeModelName = api.healthData?.active_foundation_model || api.healthData?.active_model_id || "Local Model";
    setActiveTaskMeta({ taskType, targetAction, model: activeModelName, endpoint: "http://127.0.0.1:11434", networkEgress: "0 Bytes (Air-Gapped)" });

    setPrompt('');
    setLoadingSessionId(targetSessionId);
    setThinkingExpanded(false);


    const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query || "Analyze attached file(s) and provide technical assessment.",
          attachments: uploadedAttachments,
          history: historyPayload
        })
      });
      const data = await res.json();

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.summary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        routing: data.routing,
        steps: data.steps,
        artifacts: data.artifacts,
        sandbox_output: data.sandbox_output,
        sovereign_proof: data.sovereign_proof,
        elapsed_seconds: data.elapsed_seconds
      };

      if (targetSessionId === currentSessionId && data.artifacts?.length > 0) {
        setSelectedDeliverable(data.artifacts[0]);
        setRightPanelOpen(true);
      }

      chatSessions.addMessageToSession(targetSessionId, assistantMsg);
      api.fetchSecurityData();
    } catch (err) {
      chatSessions.addMessageToSession(targetSessionId, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Execution Notice: Local sovereign backend error (${err.message}). Ensure 127.0.0.1:8000 is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      });
    } finally {
      setLoadingSessionId(null);
    }
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
        scenarios={api.scenarios}
        allArtifactsCount={allArtifacts.length}
        onNewChat={() => { chatSessions.handleNewChat(); setPrompt(''); setSelectedDeliverable(null); }}
        onSelectSession={(id) => { chatSessions.setCurrentSessionId(id); setSelectedDeliverable(null); }}
        onDeleteSession={chatSessions.handleDeleteSession}
        onSend={handleSend}
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
          onOpenVoice={() => setRightPanelOpen(true)}
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
          <VoiceOrb
            onVoiceInput={(spokenText) => setPrompt(spokenText)}
            loading={loading}
          />
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
          onSelectModel={api.handleSelectModel}
          onRefreshHealth={api.fetchHealth}
          onClose={() => setActiveModal(null)}
        />
      )}
      <ImageLightbox
        imageUrl={expandedImage}
        onClose={() => setExpandedImage(null)}
      />
    </div>
  );
}
