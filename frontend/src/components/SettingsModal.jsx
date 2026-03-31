import React from 'react';
import { X, Settings, Cpu, Thermometer } from 'lucide-react';

export default function SettingsModal({ onClose, llmModel, setLlmModel, temperature, setTemperature }) {
  
  const handleSave = () => {
    localStorage.setItem('mindbot_model', llmModel);
    localStorage.setItem('mindbot_temp', temperature);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-panel" style={{ width: '400px', padding: '2rem', position: 'relative' }}>
        <X 
          size={24} 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }} 
        />
        
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
          <Settings size={24} /> Configuration
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>
              <Cpu size={16} /> Backend LLM Model
            </label>
            <select 
              value={llmModel} 
              onChange={(e) => setLlmModel(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', 
                background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-color)', outline: 'none'
              }}
            >
              <option value="llama3.1">Meta Llama 3.1 (Default)</option>
              <option value="gemini-2.0-flash-001">Google Gemini 2.0 Flash (Cloud)</option>
              <option value="gemini-flash-lite">Google Gemini Flash Lite (Fastest)</option>
              <option value="llama3">Llama 3 (Legacy)</option>
              <option value="mistral">Mistral 7B</option>
              <option value="phi3">Microsoft Phi-3</option>
              <option value="deepseek-coder">DeepSeek Coder</option>
              <option value="qwen2">Qwen 2 (Alibaba)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>
              <Thermometer size={16} /> Inference Temperature: {temperature}
            </label>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.1" 
              value={temperature} 
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              <span>Deterministic</span>
              <span>Creative</span>
            </div>
          </div>
        </div>

        <button className="btn" style={{ width: '100%' }} onClick={handleSave}>
          Confirm & Save
        </button>
      </div>
    </div>
  );
}
