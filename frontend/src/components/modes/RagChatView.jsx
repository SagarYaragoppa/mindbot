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
    <div className="main-chat mode-rag flex flex-col h-full bg-transparent overflow-hidden">
      <div className="mode-header flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4 glass-panel border-0 border-b border-border-color rounded-none sm:rounded-t-3xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="mode-badge bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] sm:text-xs">Knowledge Base</div>
          <h3 className="text-base sm:text-lg font-bold m-0">Document Q&A</h3>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto">
          {/* Mode Toggle */}
          <div className="toggle-container scale-90 sm:scale-100">
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all shrink-0"
            title="Clear Chat history"
          >
            <Trash2 size={14} /> <span className="hidden xs:inline">Reset</span>
          </button>

          <div className={`flex items-center gap-2 text-[10px] sm:text-xs font-medium shrink-0 ${hasDocs ? 'text-emerald-500' : 'text-red-400'}`}>
            <Database size={14} />
            <span className="hidden xs:inline">{hasDocs ? 'Vector Store Active' : 'No Docs Found'}</span>
          </div>
        </div>
      </div>

      {!hasDocs && (
        <div className="px-6 py-2 bg-red-500/10 text-red-400 text-xs border-b border-red-500/20 animate-pulse">
          ⚠️ No documents indexed. Standard chat will be used until files are uploaded.
        </div>
      )}
      
      <div className="chat-history flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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
            
            if (words.length === 0) return <div className="whitespace-pre-wrap">{text}</div>;

            let highlighted = text;
            words.forEach(word => {
              const regex = new RegExp(`(${word})`, 'gi');
              highlighted = highlighted.replace(regex, '<span class="bg-yellow-500/20 text-white border-b border-yellow-400">$1</span>');
            });
            return <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlighted }} />;
          };

          return (
            <div key={idx} className={`message ${msg.role} text-sm sm:text-base max-w-[90%] sm:max-w-[80%]`}>
              {isBot ? (
                <div className="bot-response-container prose prose-invert prose-sm sm:prose-base max-w-none">
                  {sourceContent && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-emerald-500 mb-3 tracking-wider">
                      <FileText size={12} /> Document Based Response
                    </div>
                  )}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div className="relative my-4 rounded-xl overflow-hidden border border-white/10">
                            <SyntaxHighlighter 
                              style={vscDarkPlus} 
                              language={match[1]} 
                              PreTag="div" 
                              customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8rem' }} 
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="bg-black/30 px-1.5 py-0.5 rounded text-emerald-500" {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {mainContent}
                  </ReactMarkdown>

                  {msg.latency_ms && (
                    <div className="msg-meta flex gap-3 text-[10px] opacity-50 mt-3 font-mono">
                      <span>⚡ {(msg.latency_ms / 1000).toFixed(2)}s</span>
                      <span>🤖 {msg.model || 'mistral'}</span>
                    </div>
                  )}

                  {sourceContent && (
                    <div className="source-section mt-6 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 border-l-4 border-l-emerald-500">
                      <div className="source-header flex items-center gap-2 font-bold text-emerald-500 text-[10px] uppercase mb-2 tracking-widest">
                        <Search size={14} /> Citations & Sources
                      </div>
                      <div className="text-xs sm:text-sm opacity-90 leading-relaxed text-text-primary">
                        {renderWithHighlights(sourceContent)}
                      </div>
                    </div>
                  )}
                </div>
              ) : msg.content}
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area p-4 sm:p-6 flex flex-col gap-3 relative">
        {recording && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 p-2 px-4 rounded-full text-xs font-bold flex items-center gap-2 text-white shadow-lg animate-pulse">
            <Mic size={14} /> Listening...
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {isSpeechSupported && (
            <button 
              className={`btn p-3 rounded-xl shrink-0 ${recording ? 'pulse-animation' : 'btn-secondary'}`} 
              onClick={toggleRecording} 
              disabled={loading}
            >
              {recording ? <Square size={20} /> : <Mic size={20} />}
            </button>
          )}
          
          <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3 bg-black/20 p-1 sm:p-2 rounded-2xl border border-white/5 focus-within:border-emerald-500/50 transition-colors">
            <input 
              type="text" 
              placeholder={recording ? "Recording..." : "Ask your documents..." }
              className="flex-1 bg-transparent border-none p-3 text-sm sm:text-base outline-none disabled:opacity-50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={recording}
            />
            <button 
              className="btn w-full sm:w-auto px-6 h-12 rounded-xl shrink-0 !bg-emerald-600 hover:!bg-emerald-500 text-sm sm:text-base" 
              onClick={() => handleSend()} 
              disabled={loading || recording || !input.trim()}
            >
              <Search size={18} /> Query
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
