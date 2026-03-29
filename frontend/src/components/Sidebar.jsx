import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Settings, Bot, Cpu, LogOut, Trash2, PlusCircle, MessageSquare, ShieldAlert, Sun, Moon } from 'lucide-react';

export default function Sidebar({ setMode, setToken, activeConversationId, setActiveConversationId, isAdmin, onOpenSettings, theme, setTheme }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    // Fetch implicitly synced documents from the FAISS backend data layer mapping
    axios.get('http://localhost:8000/list-docs')
      .then(res => {
        setUploadedFiles(res.data.documents || []);
      })
      .catch(err => console.error("Could not sync documents:", err));
      
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await axios.get('http://localhost:8000/conversations');
      setConversations(res.data);
      if (res.data.length > 0 && !activeConversationId) {
        setActiveConversationId(res.data[0].id);
      } else if (res.data.length === 0) {
        createNewChat();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post('http://localhost:8000/conversations');
      setConversations(prev => [res.data, ...prev]);
      setActiveConversationId(res.data.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (fname) => {
    try {
      setUploadStatus(`Deleting ${fname}...`);
      await axios.delete(`http://localhost:8000/delete-doc/${fname}`);
      setUploadedFiles(prev => prev.filter(f => f !== fname));
      setUploadStatus(`Successfully removed ${fname}`);
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
    setUploadStatus('Uploading...');

    try {
      const res = await axios.post('http://localhost:8000/upload-doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus(`Success: ${res.data.chunks} chunks indexed`);
      setUploadedFiles(prev => [...prev, file.name]);
    } catch (err) {
      console.error(err);
      setUploadStatus('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sidebar glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Bot size={32} color="#3b82f6" />
        <h2>MindBot</h2>
        <div style={{ flex: 1 }}></div>
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={20} color="var(--text-secondary)" /> : <Moon size={20} color="var(--text-primary)" />}
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Modes</h3>
        <button className="btn btn-secondary" onClick={() => setMode('chat')}>
          <Bot size={18} /> General Chat
        </button>
        <button className="btn btn-secondary" onClick={() => setMode('rag')}>
          <FileText size={18} /> Document Q&A
        </button>
        <button className="btn btn-secondary" onClick={() => setMode('agent')}>
          <Cpu size={18} /> Agent Tasks
        </button>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={() => setMode('admin')} style={{ border: '1px solid var(--accent-color)' }}>
            <ShieldAlert size={18} color="var(--accent-color)" /> Admin Panel
          </button>
        )}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Knowledge Base</h3>
        <label className="btn">
          <Upload size={18} />
          {uploading ? 'Uploading...' : 'Upload PDF'}
          <input 
            type="file" 
            accept=".pdf" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
        {uploadStatus && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{uploadStatus}</p>}
        {uploadedFiles.length > 0 && (
          <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.5rem' }}>Indexed Documents</h4>
            {uploadedFiles.map((fname, i) => (
              <div key={i} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                  <FileText size={12} style={{ flexShrink: 0 }} /> {fname}
                </span>
                <Trash2 
                  size={14} 
                  style={{ color: '#ef4444', cursor: 'pointer', flexShrink: 0 }} 
                  onClick={() => handleDelete(fname)} 
                  title="Delete Document & Rebuild DB"
                />
              </div>
            ))}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onOpenSettings}
            style={{ flex: 1, padding: '0.5rem' }}
            title="Global Settings Configuration"
          >
            <Settings size={16} /> Config
          </button>
          
          <button 
            className="btn" 
            onClick={() => setToken(null)}
            style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', padding: '0.5rem' }}
            title="Disconnect explicitly"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Conversations</h3>
          <PlusCircle size={16} style={{ cursor: 'pointer', color: 'var(--accent-color)' }} onClick={createNewChat} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conversations.map(conv => {
            const date = new Date(conv.created_at);
            const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            return (
              <div 
                key={conv.id} 
                onClick={() => setActiveConversationId(conv.id)}
                style={{ 
                  padding: '8px', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  background: activeConversationId === conv.id ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                  color: activeConversationId === conv.id ? '#fff' : 'var(--text-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <MessageSquare size={14} style={{ opacity: 0.7 }} />
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.title}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{dateStr}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
