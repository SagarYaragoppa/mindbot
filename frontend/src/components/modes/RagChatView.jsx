import { Send, Mic, Square, FileText, Search, Database, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function RagChatView({ 
  messages, input, setInput, handleSend, handleClearChat, loading, recording, 
  toggleRecording, isSpeechSupported, endOfMessagesRef, hasDocs,
  mode, setMode 
}) {
  return (
    <div className="main-chat mode-rag">
      <div className="mode-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="mode-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}>Knowledge Base</div>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Document Q&A</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Mode Toggle */}
          <div className="toggle-container">
            <span className={`toggle-label ${mode === 'chat' ? 'active' : ''}`}>General</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={mode === 'rag'} 
                onChange={(e) => setMode(e.target.checked ? 'rag' : 'chat')}
              />
              <span className="slider"></span>
            </label>
            <span className={`toggle-label ${mode === 'rag' ? 'active' : ''}`}>Docs</span>
          </div>

          <button 
            onClick={handleClearChat} 
            className="btn-icon" 
            title="Clear Chat history"
            style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}
          >
            <Trash2 size={16} /> Reset
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasDocs ? '#10b981' : '#ef4444', fontSize: '0.85rem' }}>
            <Database size={16} />
            {hasDocs ? 'Vector Store Active' : 'No Documents Found'}
          </div>
        </div>
      </div>

      {!hasDocs && (
        <div style={{ padding: '1rem 2rem', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', fontSize: '0.85rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
          ⚠️ No documents indexed. Standard chat will be used until files are uploaded.
        </div>
      )}
      
      <div className="chat-history">
        {messages.map((msg, idx) => {
          const isBot = msg.role === 'bot';
          let mainContent = msg.content;
          let sourceContent = null;

          if (isBot && mainContent.includes('\n\n### Sources\n')) {
            const parts = mainContent.split('\n\n### Sources\n');
            mainContent = parts[0];
            sourceContent = parts[1];
          }

          // Keyword Highlighting Logic
          const renderWithHighlights = (text) => {
            const lastUserMsg = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
            const query = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";
            const words = query.split(/\s+/).filter(w => w.length > 3);
            
            if (words.length === 0) return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;

            let highlighted = text;
            words.forEach(word => {
              const regex = new RegExp(`(${word})`, 'gi');
              highlighted = highlighted.replace(regex, '<span style="background: rgba(255, 255, 0, 0.2); color: #fff; border-bottom: 1px solid #ffbb00;">$1</span>');
            });
            return <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: highlighted }} />;
          };

          return (
            <div key={idx} className={`message ${msg.role}`}>
              {isBot ? (
                <>
                  {sourceContent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.05em' }}>
                      <FileText size={12} /> Document Based Response
                    </div>
                  )}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
                            <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0 }} {...props}>
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={className} style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px' }} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {mainContent}
                  </ReactMarkdown>

                  {msg.latency_ms && (
                    <div className="msg-meta" style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <span>⚡ {(msg.latency_ms / 1000).toFixed(2)}s</span>
                      <span>🤖 {msg.model || 'unknown'} ({msg.provider || 'cloud'})</span>
                    </div>
                  )}

                  {sourceContent && (
                    <div className="source-section">
                      <div className="source-header">
                        <Search size={14} /> Citations & Sources
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.5 }}>
                        {renderWithHighlights(sourceContent)}
                      </div>
                    </div>
                  )}
                </>
              ) : msg.content}
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area" style={{ position: 'relative' }}>
        {recording && <div className="listening-indicator">Listening...</div>}

        {isSpeechSupported && (
          <button className={`btn ${recording ? 'pulse-animation' : 'btn-secondary'}`} style={{ padding: '0.75rem' }} onClick={toggleRecording} disabled={loading}>
            {recording ? <Square size={20} /> : <Mic size={20} />}
          </button>
        )}
        
        <input 
          type="text" 
          placeholder={recording ? "Recording..." : "Ask something about your documents..." }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={recording}
        />
        <button className="btn" onClick={() => handleSend()} disabled={loading || recording} style={{ background: '#10b981' }}>
          <Search size={18} /> Query KB
        </button>
      </div>
    </div>
  );
}
