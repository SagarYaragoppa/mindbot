import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthView from './components/AuthView';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import axios from 'axios';

// ─── ONE-TIME localStorage PURGE ───────────────────────────────────────────
// Runs immediately when the JS bundle loads (before any React render).
// Removes ALL stale model/provider keys that old deployments may have written.
// This is the permanent fix for browsers that still have cached model data.
const STALE_KEYS = [
  'mindbot_model',
  'mindbot_provider',
  'llm_model',
  'llm_provider',
  'model',
  'provider',
  'selectedModel',
  'selected_model',
];
STALE_KEYS.forEach(k => localStorage.removeItem(k));
// ───────────────────────────────────────────────────────────────────────────

// Fixed model constants — only Mistral Cloud. Never read from localStorage.
const FIXED_MODEL = 'mistral';
const FIXED_PROVIDER = 'mistral';

function App() {
  const [mode, setMode] = useState('chat');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('mindbot-theme') || 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Temperature is the only configurable setting remaining
  const [temperature, setTemperature] = useState(
    parseFloat(localStorage.getItem('mindbot_temp')) || 0.7
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mindbot-theme', theme);
  }, [theme]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }

  useEffect(() => {
    if (token) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/me`)
        .then(res => setIsAdmin(res.data.is_admin))
        .catch(err => {
          console.error('Invalid token session:', err);
          setToken(null);
        });
    } else {
      setIsAdmin(false);
    }
  }, [token]);

  if (!token) {
    return <AuthView setToken={setToken} />;
  }

  return (
    <div className="app-wrapper">
      {/* Mobile top bar */}
      <header className="mobile-header">
        <div className="brand">
          <span style={{ color: '#3b82f6', fontSize: '1.3rem' }}>🤖</span>
          <span>MindBot</span>
        </div>
        <button
          id="hamburger-btn"
          className="hamburger-btn"
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* Overlay backdrop (mobile) */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar
        mode={mode}
        setMode={setMode}
        setToken={setToken}
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        isAdmin={isAdmin}
        onOpenSettings={() => setShowSettings(true)}
        theme={theme}
        setTheme={setTheme}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="main-content">
        {mode === 'admin' ? (
          <AdminDashboard token={token} />
        ) : (
          <ChatWindow
            mode={mode}
            setMode={setMode}
            token={token}
            activeConversationId={activeConversationId}
            setActiveConversationId={setActiveConversationId}
            temperature={temperature}
            llmModel={FIXED_MODEL}
            provider={FIXED_PROVIDER}
          />
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          temperature={temperature}
          setTemperature={setTemperature}
        />
      )}
    </div>
  );
}

export default App;
