import { Send, Mic, Square, Image as ImageIcon, Bot, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function GeneralChatView({ 
  messages, input, setInput, handleSend, handleClearChat, loading, recording, 
  toggleRecording, imageFile, setImageFile, isSpeechSupported, 
  endOfMessagesRef, mode, setMode 
}) {
  return (
    <div className="main-chat mode-chat flex flex-col h-full bg-transparent overflow-hidden">
      <div className="mode-header flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4 glass-panel border-0 border-b border-border-color rounded-none sm:rounded-t-3xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="mode-badge bg-accent-color/20 text-accent-color border border-accent-color/30 text-[10px] sm:text-xs">General</div>
          <h3 className="text-base sm:text-lg font-bold m-0">MindBot Chat</h3>
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
            title="Clear Chat"
          >
            <Trash2 size={14} /> <span className="hidden xs:inline">Reset</span>
          </button>
          
          <Bot size={20} className="opacity-40 hidden sm:block" />
        </div>
      </div>
      
      <div className="chat-history flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role} text-sm sm:text-base max-w-[90%] sm:max-w-[80%]`}>
            {msg.role === 'bot' ? (
              <div className="bot-response-container prose prose-invert prose-sm sm:prose-base max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="relative my-4 rounded-xl overflow-hidden border border-white/10">
                          <div className="bg-black/40 px-4 py-1.5 text-[10px] sm:text-xs text-text-secondary flex justify-between items-center border-b border-white/5">
                            <span className="font-mono uppercase">{match[1]}</span>
                            <button 
                              onClick={() => navigator.clipboard.writeText(String(children))} 
                              className="text-accent-color hover:text-white transition-colors"
                            >
                              Copy
                            </button>
                          </div>
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
                        <code className="bg-black/30 px-1.5 py-0.5 rounded text-accent-color" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>

                {msg.latency_ms && (
                  <div className="msg-meta flex gap-3 text-[10px] sm:text-xs opacity-50 mt-3 font-mono">
                    <span>⚡ {(msg.latency_ms / 1000).toFixed(2)}s</span>
                    <span>🤖 {msg.model || 'mistral'}</span>
                  </div>
                )}
              </div>
            ) : msg.content}
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area p-4 sm:p-6 flex flex-col gap-3 relative">
        {imageFile && (
          <div className="absolute -top-12 left-6 bg-accent-color p-2 px-4 rounded-full text-xs flex items-center gap-2 text-white shadow-lg shadow-black/20 animate-in fade-in slide-in-from-bottom-2">
            <ImageIcon size={14} /> 
            <span className="max-w-[150px] truncate">{imageFile.name}</span>
            <button onClick={() => setImageFile(null)} className="hover:scale-125 transition-transform">✕</button>
          </div>
        )}
        
        {recording && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 p-2 px-4 rounded-full text-xs font-bold flex items-center gap-2 text-white shadow-lg animate-pulse">
            <Mic size={14} /> Listening...
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex gap-2 shrink-0">
            {isSpeechSupported && (
              <button 
                className={`btn p-3 rounded-xl ${recording ? 'pulse-animation' : 'btn-secondary'}`} 
                onClick={toggleRecording} 
                disabled={loading}
              >
                {recording ? <Square size={20} /> : <Mic size={20} />}
              </button>
            )}
            
            <label className="btn btn-secondary p-3 rounded-xl cursor-pointer">
              <ImageIcon size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
            </label>
          </div>

          <div className="flex-1 flex gap-2 sm:gap-3 bg-black/20 p-1 rounded-2xl border border-white/5 focus-within:border-accent-color/50 transition-colors">
            <input 
              type="text" 
              placeholder={recording ? "Recording..." : "Message MindBot..." }
              className="flex-1 bg-transparent border-none p-3 text-sm sm:text-base outline-none disabled:opacity-50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={recording}
            />
            <button 
              className="btn h-10 w-10 sm:h-12 sm:w-auto sm:px-6 rounded-xl shrink-0" 
              onClick={() => handleSend()} 
              disabled={loading || recording || (!input.trim() && !imageFile)}
            >
              <Send size={18} /> <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
