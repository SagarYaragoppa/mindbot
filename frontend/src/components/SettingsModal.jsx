import React from 'react';
import { X, Settings, Thermometer, Cloud } from 'lucide-react';

export default function SettingsModal({ onClose, temperature, setTemperature }) {

  const handleSave = () => {
    localStorage.setItem('mindbot_temp', temperature);
    // Nuke any stale model/provider keys — belt-and-suspenders cleanup
    ['mindbot_model', 'mindbot_provider', 'llm_model', 'llm_provider',
     'model', 'provider', 'selectedModel', 'selected_model'].forEach(k =>
      localStorage.removeItem(k)
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel modal-card">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close settings">
          <X size={20} />
        </button>

        <h2 className="modal-title">
          <Settings size={22} /> Configuration
        </h2>

        {/* Model display — read-only */}
        <div className="modal-field">
          <label className="modal-label">
            <Cloud size={15} /> Backend LLM Model
          </label>
          <div style={{
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            color: '#93c5fd',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Cloud size={14} /> Mistral Cloud
          </div>
          <p className="modal-hint">* Exclusive cloud model — optimised for reliability</p>
        </div>

        {/* Temperature slider */}
        <div className="modal-field">
          <label className="modal-label">
            <Thermometer size={15} /> Inference Temperature: <strong style={{ color: 'var(--accent-color)', marginLeft: '0.25rem' }}>{temperature}</strong>
          </label>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
          />
          <div className="range-labels">
            <span>🎯 Deterministic</span>
            <span>✨ Creative</span>
          </div>
        </div>

        <button className="btn modal-save-btn" onClick={handleSave}>
          Confirm &amp; Save
        </button>
      </div>
    </div>
  );
}
