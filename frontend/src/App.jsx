import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthView from './components/AuthView';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import axios from 'axios';

// ─── ONE-TIME localStorage PURGE ─────────────────────────────────────────────
// Removes ALL stale model/provider keys from old deployments on every load.
const STALE_KEYS = [
  'mindbot_model', 'mindbot_provider', 'llm_model', 'llm_provider',
  'model', 'provider', 'selectedModel', 'selected_model',
];
STALE_KEYS.forEach(k => localStorage.removeItem(k));
// ─────────────────────────────────────────────────────────────────────────────

// Fixed model constants — only Mistral Cloud. Never read from localStorage.
const FIXED_MODEL    = 'mistral';
const FIXED_PROVIDER = 'mistral';

// ─── GLOBAL AXIOS 401 INTERCEPTOR ────────────────────────────────────────────
// Registered once at module level so it is always active regardless of render.
// On any 401, wipe storage and reload — the app will land on AuthView.
let interceptorRegistered = false;
function registerAxiosInterceptor(onForceLogout) {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  axios.interceptors.response.use(
    response => response,
    error => {
      if (error?.response?.status === 401) {
        console.warn('[Auth] 401 received — forcing logout');
        onForceLogout();
      }
      return Promise.reject(error);
    }
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [token, setToken]     = useState(() => localStorage.getItem('token') || null);
  const [authReady, setAuthReady] = useState(false);   // true once /auth/me resolves
  const [isAdmin, setIsAdmin] = useState(false);

  const [mode, setMode]       = useState('chat');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [theme, setTheme]     = useState(localStorage.getItem('mindbot-theme') || 'dark');
  const [temperature, setTemperature] = useState(
    parseFloat(localStorage.getItem('mindbot_temp')) || 0.7
  );

  // ── Centralised logout ───────────────────────────────────────────────────
  const forceLogout = useCallback(() => {
    // Wipe every auth-related key so nothing stale remains
    ['token', 'mindbot_model', 'mindbot_provider'].forEach(k =>
      localStorage.removeItem(k)
    );
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setIsAdmin(false);
    setAuthReady(false);
    setActiveConversationId(null);
  }, []);

  // Register global 401 interceptor once (ref to forceLogout via closure)
  useEffect(() => {
    registerAxiosInterceptor(forceLogout);
  }, [forceLogout]);

  // ── Theme persistence ────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mindbot-theme', theme);
  }, [theme]);

  // ── Close sidebar on desktop resize ─────────────────────────────────────
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Sync axios Authorization header whenever token changes ───────────────
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // ── Verify token via /auth/me on mount and whenever token changes ────────
  useEffect(() => {
    if (!token) {
      // No token at all → nothing to verify, go straight to login
      setAuthReady(false);
      setIsAdmin(false);
      return;
    }

    setAuthReady(false); // block the UI while we verify

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/me`)
      .then(res => {
        setIsAdmin(res.data.is_admin ?? false);
        setAuthReady(true); // ✅ token is valid, render the app
      })
      .catch(err => {
        // 401 is handled by the interceptor (calls forceLogout).
        // For other errors (network, 5xx) be lenient: log and force logout.
        console.error('[Auth] /auth/me failed:', err);
        forceLogout();
      });
  }, [token, forceLogout]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER GATES
  // ─────────────────────────────────────────────────────────────────────────

  // 1. No token → show login
  if (!token) {
    return <AuthView setToken={setToken} />;
  }

  // 2. Token exists but /auth/me hasn't resolved yet → show a minimal loader
  //    (prevents chat UI + sidebar from firing any API calls with a bad token)
  if (!authReady) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', width: '100%', flexDirection: 'column', gap: '1rem',
        background: 'var(--bg-color)', color: 'var(--text-secondary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: 36, height: 36, border: '3px solid var(--border-color)',
          borderTop: '3px solid var(--accent-color)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.85rem' }}>Verifying session…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 3. Authenticated and verified → render full app
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

      {/* Sidebar — only mounted after auth is verified */}
      <Sidebar
        mode={mode}
        setMode={setMode}
        setToken={forceLogout}
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
