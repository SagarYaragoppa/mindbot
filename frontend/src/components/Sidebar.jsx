import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Upload, FileText, Settings, Bot, Cpu, LogOut, Trash2,
  PlusCircle, MessageSquare, ShieldAlert, Sun, Moon
} from 'lucide-react';

export default function Sidebar({
  mode, setMode, setToken, activeConversationId, setActiveConversationId,
  isAdmin, onOpenSettings, theme, setTheme, isOpen, onClose
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [lastSummary, setLastSummary] = useState('');

  useEffect(() => {
    let isMounted = true;

    const syncData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/list-docs`);
        if (isMounted) setUploadedFiles(res.data.documents || []);
      } catch (err) {
        console.error('Could not sync documents:', err);
      }

      try {
        await fetchConversations();
      } catch (err) {
        console.error('Fetch convs failed:', err);
      }
    };

    syncData();
    return () => { isMounted = false; };
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/conversations`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.conversations || []);
      setConversations(data);
      if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id);
      } else if (data.length === 0) {
        createNewChat();
      }
    } catch (err) {
      console.error(err);
      setConversations([]);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/conversations`);
      setConversations(prev => [res.data, ...prev]);
      setActiveConversationId(res.data.id);
      onClose(); // close sidebar on mobile after selecting
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (fname) => {
    try {
      setUploadStatus(`Deleting ${fname}...`);
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/delete-doc/${fname}`);
      setUploadedFiles(prev => prev.filter(f => f !== fname));
      setUploadStatus(`Removed ${fname}`);
    } catch (err) {
      console.error(err);
      setUploadStatus(`Failed to delete ${fname}`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setUploadStatus('Uploading & indexing...');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/upload-doc`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus('Upload successful!');
      setUploadedFiles(prev => [...prev, file.name]);
      if (res.data.summary) setLastSummary(res.data.summary);
    } catch (err) {
      console.error(err);
      setUploadStatus('Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    onClose(); // close sidebar on mobile
  };

  const safeConversations = Array.isArray(conversations) ? conversations : [];

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <Bot size={26} color="#3b82f6" />
        <h2>MindBot</h2>
        <button
          className="theme-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark'
            ? <Sun size={17} />
            : <Moon size={17} />
          }
        </button>
      </div>

      {/* Mode buttons */}
      <div>
        <p className="sidebar-section-title">Modes</p>
        <div className="mode-buttons">
          <button
            className="btn mode-btn"
            style={mode === 'chat'
              ? { background: '#3b82f6' }
              : { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
            }
            onClick={() => handleModeChange('chat')}
          >
            <Bot size={16} /> General Chat
          </button>
          <button
            className="btn mode-btn"
            style={mode === 'rag'
              ? { background: '#10b981' }
              : { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
            }
            onClick={() => handleModeChange('rag')}
          >
            <FileText size={16} /> Document Q&A
          </button>
          <button
            className="btn mode-btn"
            style={mode === 'agent'
              ? { background: '#8b5cf6' }
              : { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
            }
            onClick={() => handleModeChange('agent')}
          >
            <Cpu size={16} /> Agent Tasks
          </button>
          {isAdmin && (
            <button
              className="btn mode-btn"
              style={{
                background: mode === 'admin' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${mode === 'admin' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)'}`,
                color: 'var(--accent-color)'
              }}
              onClick={() => handleModeChange('admin')}
            >
              <ShieldAlert size={16} /> Admin Panel
            </button>
          )}
        </div>
      </div>

      {/* Knowledge Base Upload */}
      <div className="kb-section">
        <p className="sidebar-section-title">Knowledge Base</p>
        <label className="btn" style={{ width: '100%', cursor: 'pointer' }}>
          <Upload size={15} />
          {uploading ? 'Uploading...' : 'Upload PDF'}
          <input
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>

        {uploadStatus && (
          <p className="upload-status-text">{uploadStatus}</p>
        )}

        {uploadedFiles.length > 0 && (
          <div className="kb-file-list">
            <p className="sidebar-section-title" style={{ marginBottom: '0.5rem' }}>Indexed Documents</p>
            {uploadedFiles.map((fname, i) => (
              <div key={i} className="kb-file-item">
                <span className="kb-file-name">
                  <FileText size={11} style={{ flexShrink: 0 }} />
                  {fname}
                </span>
                <button
                  className="kb-delete-btn"
                  onClick={() => handleDelete(fname)}
                  title={`Delete ${fname}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {lastSummary && (
          <div className="summary-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--accent-color)', fontSize: '0.72rem', marginBottom: '0.5rem' }}>
              <Bot size={13} /> Quick Summary
            </div>
            <div style={{ fontSize: '0.78rem', maxHeight: '120px', overflowY: 'auto', lineHeight: 1.5 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{lastSummary}</ReactMarkdown>
            </div>
            <button
              onClick={() => setLastSummary('')}
              style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.4rem', textDecoration: 'underline' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Conversations */}
      <div className="conversations-section">
        <div className="conversations-header">
          <p className="sidebar-section-title" style={{ marginBottom: 0 }}>Conversations</p>
          <button className="icon-btn" onClick={createNewChat} title="New Conversation">
            <PlusCircle size={17} />
          </button>
        </div>
        <div className="conversations-list">
          {safeConversations.map(conv => {
            const date = new Date(conv.created_at);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            const isActive = activeConversationId === conv.id;

            return (
              <div
                key={conv.id}
                className={`conversation-item${isActive ? ' active' : ''}`}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  onClose();
                }}
              >
                <MessageSquare size={13} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                <span className="conversation-title">{conv.title}</span>
                <span className="conversation-date">{dateStr}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="sidebar-actions">
        <button
          className="btn"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          onClick={() => { onOpenSettings(); onClose(); }}
          title="Configuration"
        >
          <Settings size={15} /> Config
        </button>
        <button
          className="btn"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          onClick={() => setToken(null)}
          title="Logout"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </aside>
  );
}
