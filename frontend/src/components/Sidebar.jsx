import { Upload, FileText, Settings, Bot, Cpu, LogOut, Trash2, PlusCircle, MessageSquare, ShieldAlert, Sun, Moon, Menu, X as CloseIcon } from 'lucide-react';

export default function Sidebar({ mode, setMode, setToken, activeConversationId, setActiveConversationId, isAdmin, onOpenSettings, theme, setTheme }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [lastSummary, setLastSummary] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const syncData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/list-docs`);
        if (isMounted) {
          setUploadedFiles(res.data.documents || []);
          setServerError(false);
        }
      } catch (err) {
        console.error("Could not sync documents:", err);
        if (isMounted) setServerError(true);
      }
      
      try {
        await fetchConversations();
      } catch (err) {
        console.error("Fetch convs failed:", err);
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
      if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (fname) => {
    try {
      setUploadStatus(`Deleting ${fname}...`);
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/delete-doc/${fname}`);
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
    setUploadStatus('Uploading & indexing...');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/upload-doc`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus(`Success!`);
      setUploadedFiles(prev => [...prev, file.name]);
      if (res.data.summary) {
        setLastSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
      setUploadStatus(`Upload failed.`);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const safeConversations = Array.isArray(conversations) ? conversations : [];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 glass-panel mb-4">
        <div className="flex items-center gap-2">
          <Bot size={24} color="#3b82f6" />
          <h2 className="text-xl font-bold">MindBot</h2>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-accent-color/10 rounded-lg text-accent-color"
        >
          {isMobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`sidebar glass-panel transition-all duration-300 ${isMobileMenuOpen ? 'max-h-[80vh] opacity-100 visible mb-4' : 'max-h-0 lg:max-h-none opacity-0 lg:opacity-100 invisible lg:visible overflow-hidden lg:overflow-y-auto'}`}>
        <div className="hidden lg:flex items-center gap-3 mb-6">
          <Bot size={32} color="#3b82f6" />
          <h2 className="text-2xl font-bold">MindBot</h2>
          <div className="flex-1"></div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={20} className="text-text-secondary" /> : <Moon size={20} className="text-text-primary" />}
          </button>
        </div>
        
        <div className="flex flex-col gap-3 mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-1">Modes</h3>
          <button 
            className={`btn w-full justify-start ${mode === 'chat' ? '' : 'btn-secondary'}`} 
            onClick={() => { setMode('chat'); setIsMobileMenuOpen(false); }}
            style={mode === 'chat' ? { background: 'var(--accent-color)' } : {}}
          >
            <Bot size={18} /> General Chat
          </button>
          <button 
            className={`btn w-full justify-start ${mode === 'rag' ? '' : 'btn-secondary'}`} 
            onClick={() => { setMode('rag'); setIsMobileMenuOpen(false); }}
            style={mode === 'rag' ? { background: '#10b981' } : {}}
          >
            <FileText size={18} /> Document Q&A
          </button>
          <button 
            className={`btn w-full justify-start ${mode === 'agent' ? '' : 'btn-secondary'}`} 
            onClick={() => { setMode('agent'); setIsMobileMenuOpen(false); }}
            style={mode === 'agent' ? { background: '#8b5cf6' } : {}}
          >
            <Cpu size={18} /> Agent Tasks
          </button>
          {isAdmin && (
            <button 
              className={`btn w-full justify-start ${mode === 'admin' ? '' : 'btn-secondary'}`} 
              onClick={() => { setMode('admin'); setIsMobileMenuOpen(false); }} 
              style={{ border: mode === 'admin' ? '1px solid #fff' : '1px solid var(--accent-color)' }}
            >
              <ShieldAlert size={18} color={mode === 'admin' ? '#fff' : 'var(--accent-color)'} /> Admin Panel
            </button>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Knowledge Base</h3>
          <label className="btn w-full cursor-pointer">
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          {uploadStatus && <p className="text-xs text-text-secondary italic">{uploadStatus}</p>}
          
          {uploadedFiles.length > 0 && (
            <div className="bg-white/5 rounded-xl p-3 border border-border-color">
              <h4 className="text-[10px] uppercase font-bold text-text-secondary mb-2">Indexed Documents</h4>
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                {uploadedFiles.map((fname, i) => (
                  <div key={i} className="text-xs flex items-center justify-between group">
                    <span className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]">
                      <FileText size={12} className="shrink-0" /> {fname}
                    </span>
                    <Trash2 
                      size={14} 
                      className="text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={() => handleDelete(fname)} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {lastSummary && (
            <div className="summary-box p-4 rounded-xl border border-accent-color/30">
              <div className="flex items-center gap-2 font-bold text-accent-color text-xs mb-2">
                <Bot size={14} /> Quick Summary
              </div>
              <div className="text-xs max-h-32 overflow-y-auto leading-relaxed prose prose-invert prose-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lastSummary}</ReactMarkdown>
              </div>
              <button 
                onClick={() => setLastSummary('')}
                className="text-[10px] text-text-secondary underline mt-2 hover:text-white"
              >
                Clear
              </button>
            </div>
          )}
          
          <div className="flex gap-2 mt-2">
            <button 
              className="btn btn-secondary flex-1 py-2" 
              onClick={() => { onOpenSettings(); setIsMobileMenuOpen(false); }}
              title="Global Settings Configuration"
            >
              <Settings size={16} /> Config
            </button>
            
            <button 
              className="btn flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" 
              onClick={() => setToken(null)}
              title="Logout"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border-t border-border-color pt-4 mt-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Conversations</h3>
            <PlusCircle size={18} className="cursor-pointer text-accent-color hover:scale-110 transition-transform" onClick={createNewChat} />
          </div>
          
          <div className="flex flex-col gap-2">
            {safeConversations.map(conv => {
              const date = new Date(conv.created_at);
              const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
              const isActive = activeConversationId === conv.id;
              
              return (
                <div 
                  key={conv.id} 
                  onClick={() => { setActiveConversationId(conv.id); setIsMobileMenuOpen(false); }}
                  className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-all ${isActive ? 'bg-accent-color text-white' : 'bg-white/5 text-text-primary hover:bg-white/10'}`}
                >
                  <MessageSquare size={14} className={isActive ? 'opacity-100' : 'opacity-60'} />
                  <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {conv.title}
                  </div>
                  <div className={`text-[10px] ${isActive ? 'text-white/70' : 'text-text-secondary/60'}`}>{dateStr}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
