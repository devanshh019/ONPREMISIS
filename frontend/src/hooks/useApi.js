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
    } catch (e) { /* ignore */ }
  };

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/scenarios');
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } catch (e) { /* ignore */ }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
    } catch (e) { /* ignore */ }
  };

  const fetchSecurityData = async () => {
    try {
      const res = await fetch('/api/security/status');
      const data = await res.json();
      setSecurityData(data);
    } catch (e) { /* ignore */ }
  };

  const fetchKbDocuments = async () => {
    try {
      const res = await fetch('/api/knowledge-base/documents');
      const data = await res.json();
      setKbDocuments(data.documents || []);
      setKbStats(data.stats || null);
    } catch (e) { /* ignore */ }
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
      if (res.ok) {
        await fetchKbDocuments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKbUploadLoading(false);
    }
  };

  const handleKbDelete = async (docId) => {
    try {
      const res = await fetch(`/api/knowledge-base/documents/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setKbDocuments(prev => prev.filter(d => d.doc_id !== docId));
      }
    } catch (e) { /* ignore */ }
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
    } catch (e) { /* ignore */ }
  };

  const handleSelectModel = async (modelId) => {
    try {
      const res = await fetch('/api/models/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      if (res.ok) {
        await fetchHealth();
      }
    } catch (e) { /* ignore */ }
  };

  const handleGenerateCert = async () => {
    try {
      const res = await fetch('/api/security/certificate');
      const data = await res.json();
      setCertificate(data);
    } catch (e) { /* ignore */ }
  };

  return {

    scenarios,
    healthData,
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

    fetchHealth,
    fetchSecurityData,
    fetchKbDocuments,
    handleKbUpload,
    handleKbDelete,
    handleKbSearch,
    handleSelectModel,
    handleGenerateCert,
  };
}
