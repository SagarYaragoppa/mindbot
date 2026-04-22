import React from 'react';
import { X, Settings, Thermometer, Cloud } from 'lucide-react';

export default function SettingsModal({ onClose, temperature, setTemperature }) {
  
  const handleSave = () => {
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
