import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthView from './components/AuthView';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import axios from 'axios';
import { Menu, X } from 'lucide-react';

function App() {
  const [mode, setMode] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('mindbot-theme') || 'dark');
  
  const [temperature, setTemperature] = useState(parseFloat(localStorage.getItem('mindbot_temp')) || 0.7);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mindbot-theme', theme);
  }, [theme]);

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }

  useEffect(() => {
    if (token) {
      // Verify token and explicitly fetch Role escalation capabilities
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/me`)
        .then(res => setIsAdmin(res.data.is_admin))
        .catch(err => {
          console.error("Invalid token session:", err);
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
    <div className="app-container">
      {/* Mobile Header Toggle */}
      <div className="mobile-header">
        <button className="btn-icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--accent-color)' }}>MindBot</h2>
      </div>

      <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
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
        />
      </div>
      {mode === 'admin' ? (
        <AdminDashboard token={token} />
      ) : (
        <ChatWindow 
          mode={mode} 
          setMode={setMode}
          token={token} 
          activeConversationId={activeConversationId} 
          temperature={temperature}
        />
      )}
      
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
