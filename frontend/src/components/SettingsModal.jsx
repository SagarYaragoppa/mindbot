import React from 'react';
import { X, Settings, Thermometer, Cloud } from 'lucide-react';

const MODELS = [
  { value: "mistral", label: "Mistral (Cloud)" }
];

export default function SettingsModal({ onClose, temperature, setTemperature, llmModel, setLlmModel, provider, setProvider }) {
  
  const handleSave = () => {
    localStorage.setItem('mindbot_temp', temperature);
    localStorage.setItem('mindbot_model', llmModel);
    localStorage.setItem('mindbot_provider', provider);
    onClose();
  };

  const handleModelChange = (e) => {
    const selectedValue = e.target.value;
    const modelObj = MODELS.find(m => m.value === selectedValue);
    if (modelObj) {
      setLlmModel(modelObj.value);
      setProvider('mistral');
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="glass-panel w-[90%] sm:w-[400px] p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto mx-auto">
        <X 
          size={24} 
          onClick={onClose} 
          className="absolute top-6 right-6 cursor-pointer text-text-secondary hover:text-white transition-colors"
        />
        
        <h2 className="flex items-center gap-2 mb-6 text-xl sm:text-2xl font-bold text-accent-color">
          <Settings size={24} /> Configuration
        </h2>

        <div className="flex flex-col gap-6 mb-8">
          <div>
            <label className="flex items-center gap-2 mb-2 font-medium text-sm sm:text-base">
              <Cloud size={16} /> Backend LLM Model
            </label>
            <select 
              value={llmModel} 
              onChange={handleModelChange}
              disabled={true}
              className="w-full p-3 rounded-lg bg-black/20 text-white border border-border-color text-sm sm:text-base outline-none cursor-not-allowed opacity-80"
            >
              {MODELS.map(m => (
                <option key={m.value} value={m.value} className="bg-[#1e293b]">
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-1 ml-1 italic">* Exclusive cloud model for stability</p>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2 font-medium text-sm sm:text-base">
              <Thermometer size={16} /> Inference Temperature: {temperature}
            </label>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.1" 
              value={temperature} 
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-2 bg-black/20 rounded-lg appearance-none accent-accent-color"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-text-secondary mt-2">
              <span>Deterministic</span>
              <span>Creative</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button className="btn w-full sm:w-auto px-10 text-sm sm:text-base py-3" onClick={handleSave}>
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
}
