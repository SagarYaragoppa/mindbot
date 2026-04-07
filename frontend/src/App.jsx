import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthView from './components/AuthView';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import axios from 'axios';

function App() {
  const [mode, setMode] = useState('chat');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('mindbot-theme') || 'dark');
  
  // Settings Logic Arrays
  const [llmModel, setLlmModel] = useState(localStorage.getItem('mindbot_model') || 'llama3.1');
  const [temperature, setTemperature] = useState(parseFloat(localStorage.getItem('mindbot_temp')) || 0.7);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mindbot-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token and explicitly fetch Role escalation capabilities
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/me`)
        .then(res => setIsAdmin(res.data.is_admin))
        .catch(err => {
          console.error("Invalid token session:", err);
          setToken(null);
        });
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setIsAdmin(false);
    }
  }, [token]);

  if (!token) {
    return <AuthView setToken={setToken} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        setMode={setMode} 
        setToken={setToken} 
        activeConversationId={activeConversationId} 
        setActiveConversationId={setActiveConversationId} 
        isAdmin={isAdmin}
        onOpenSettings={() => setShowSettings(true)}
        theme={theme}
        setTheme={setTheme}
      />
      {mode === 'admin' ? (
        <AdminDashboard token={token} />
      ) : (
        <ChatWindow 
          mode={mode} 
          token={token} 
          activeConversationId={activeConversationId} 
          setActiveConversationId={setActiveConversationId} 
          llmModel={llmModel}
          temperature={temperature}
        />
      )}
      
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          llmModel={llmModel} 
          setLlmModel={setLlmModel}
          temperature={temperature}
          setTemperature={setTemperature}
        />
      )}
    </div>
  );
}

export default App;
