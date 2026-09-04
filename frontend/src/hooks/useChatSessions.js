import { useState, useEffect } from 'react';

function createFreshSession() {
  return {
    id: `sess-${Date.now()}`,
    title: 'New Industrial Task',
    messages: [],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

export default function useChatSessions() {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('kavach_chat_sessions');
      let parsed = saved ? JSON.parse(saved) : [];
      parsed = parsed.filter(s => s.messages && s.messages.length > 0);
      const freshSession = createFreshSession();
      return [freshSession, ...parsed];
    } catch (e) {
      return [createFreshSession()];
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState(() => sessions[0]?.id || `sess-${Date.now()}`);


  useEffect(() => {
    try {
      const toSave = sessions.filter(s => (s.messages && s.messages.length > 0) || s.id === currentSessionId);
      localStorage.setItem('kavach_chat_sessions', JSON.stringify(toSave));
    } catch (e) { /* ignore */ }
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession?.messages || [];

  const handleNewChat = () => {
    if (currentSession && currentSession.messages.length === 0) {
      return;
    }
    const newSess = createFreshSession();
    setSessions(prev => [newSess, ...prev.filter(s => s.messages && s.messages.length > 0)]);
    setCurrentSessionId(newSess.id);
  };

  const handleDeleteSession = (e, sessId) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessId);
    if (updated.length === 0) {
      const fresh = createFreshSession();
      setSessions([fresh]);
      setCurrentSessionId(fresh.id);
    } else {
      setSessions(updated);
      if (currentSessionId === sessId) {
        setCurrentSessionId(updated[0].id);
      }
    }
  };

  const addMessageToSession = (sessionId, message) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, messages: [...s.messages, message] };
      }
      return s;
    }));
  };

  const updateSessionTitle = (sessionId, title) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, title };
      }
      return s;
    }));
  };

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    currentSession,
    messages,
    handleNewChat,
    handleDeleteSession,
    addMessageToSession,
    updateSessionTitle,
  };
}
