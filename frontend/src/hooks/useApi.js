import { useState, useEffect, useRef } from 'react';

export default function useApi() {
  const [scenarios, setScenarios] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [models, setModels] = useState([]);

  const [kbQuery, setKbQuery] = useState('');
  const [kbResults, setKbResults] = useState([]);
  const [kbDocuments, setKbDocuments] = useState([]);
  const [kbStats, setKbStats] = useState(null);
  const [kbUploadLoading, setKbUploadLoading] = useState(false);
  const [kbTab, setKbTab] = useState('search');
  const kbFileInputRef = useRef(null);

  const [modelRegistryTab, setModelRegistryTab] = useState('list');
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelCapabilities, setNewModelCapabilities] = useState(['ENGINEERING_MATH_AND_CODE']);
  const [newModelDefault, setNewModelDefault] = useState(false);
  const [isRegisteringModel, setIsRegisteringModel] = useState(false);
  const [modelRegisterSuccess, setModelRegisterSuccess] = useState('');

  useEffect(() => {
    fetchHealth();
    fetchScenarios();
    fetchModels();
    fetchSecurityData();
    fetchKbDocuments();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
    } catch (e) {}
  };

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/scenarios');
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } catch (e) {}
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch (e) {}
  };

  const fetchSecurityData = async () => {
    try {
      const res = await fetch('/api/security/status');
      const data = await res.json();
      setSecurityData(data);
    } catch (e) {}
  };

  const fetchKbDocuments = async () => {
    try {
      const res = await fetch('/api/knowledge-base/documents');
      const data = await res.json();
      setKbDocuments(data.documents || []);
      setKbStats(data.stats || null);
    } catch (e) {}
  };

  const handleKbUpload = async (file) => {
    if (!file) return;
    setKbUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) await fetchKbDocuments();
    } catch (e) {
      console.error(e);
    } finally {
      setKbUploadLoading(false);
    }
  };

  const handleKbDelete = async (docId) => {
    try {
      const res = await fetch(`/api/knowledge-base/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) setKbDocuments(prev => prev.filter(d => d.doc_id !== docId));
    } catch (e) {}
  };

  const handleKbSearch = async (e) => {
    e.preventDefault();
    if (!kbQuery.trim()) return;
    try {
      const res = await fetch('/api/knowledge-base/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: kbQuery })
      });
      const data = await res.json();
      setKbResults(data.results || []);
    } catch (e) {}
  };

  const handleSelectModel = async (modelId, modelName) => {
    try {
      if (modelName) {
        setHealthData(prev => prev ? {
          ...prev,
          active_model_id: modelId,
          active_foundation_model: modelName
        } : prev);
      }
      const res = await fetch('/api/models/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      if (res.ok) {
        await fetchHealth();
        await fetchModels();
      }
    } catch (e) {}
  };

  const handleRegisterModel = async (e) => {
    if (e) e.preventDefault();
    if (!newModelId.trim()) return;
    setIsRegisteringModel(true);
    setModelRegisterSuccess('');
    try {
      const res = await fetch('/api/models/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newModelId.trim(),
          name: newModelName.trim() || newModelId.trim(),
          capabilities: newModelCapabilities,
          default: newModelDefault,
        })
      });
      const data = await res.json();
      if (data.success) {
        setModels(data.models || []);
        setModelRegisterSuccess(`Saved ${newModelId.trim()} to model.yaml`);
        setNewModelId('');
        setNewModelName('');
        setNewModelCapabilities(['ENGINEERING_MATH_AND_CODE']);
        setNewModelDefault(false);
        await fetchHealth();
        await fetchModels();
        setTimeout(() => setModelRegisterSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegisteringModel(false);
    }
  };

  const toggleCapability = (cap) => {
    setNewModelCapabilities(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    );
  };

  const handleGenerateCert = async () => {
    try {
      const res = await fetch('/api/security/certificate');
      const data = await res.json();
      setCertificate(data);
    } catch (e) {}
  };

  return {
    scenarios,
    healthData,
    setHealthData,
    securityData,
    certificate,
    models,

    kbQuery, setKbQuery,
    kbResults,
    kbDocuments,
    kbStats,
    kbUploadLoading,
    kbTab, setKbTab,
    kbFileInputRef,

    modelRegistryTab, setModelRegistryTab,
    newModelId, setNewModelId,
    newModelName, setNewModelName,
    newModelCapabilities,
    newModelDefault, setNewModelDefault,
    isRegisteringModel,
    modelRegisterSuccess,

    fetchHealth,
    fetchModels,
    fetchSecurityData,
    fetchKbDocuments,
    handleKbUpload,
    handleKbDelete,
    handleKbSearch,
    handleSelectModel,
    handleRegisterModel,
    toggleCapability,
    handleGenerateCert,
  };
}
