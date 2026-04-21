import { Send, Mic, Square, Cpu, Terminal, Zap, CheckCircle2, Image as ImageIcon, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function AgentChatView({ 
  messages, input, setInput, handleSend, handleClearChat, loading, recording, 
  toggleRecording, imageFile, setImageFile, isSpeechSupported, endOfMessagesRef 
}) {
  return (
    <div className="main-chat mode-agent flex flex-col h-full bg-transparent overflow-hidden">
      <div className="mode-header flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4 glass-panel border-0 border-b border-border-color rounded-none sm:rounded-t-3xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="mode-badge bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[10px] sm:text-xs uppercase">Autonomous Agent</div>
          <h3 className="text-base sm:text-lg font-bold m-0 text-violet-100">Task Execution</h3>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto">
          <button 
            onClick={handleClearChat} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all shrink-0"
            title="Reset Agent"
          >
            <Trash2 size={14} /> <span className="hidden xs:inline">Reset</span>
          </button>

          <div className="flex items-center gap-2 text-[10px] sm:text-xs opacity-70 font-mono text-violet-300 shrink-0">
            <Cpu size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden xs:inline">{loading ? 'Processing Task...' : 'Awaiting Task'}</span>
          </div>
        </div>
      </div>
      
      <div className="chat-history flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, idx) => {
          const isBot = msg.role === 'bot';
          const isThinking = msg.content === 'Thinking...';
          
          return (
            <div key={idx} className={`message ${msg.role} text-sm sm:text-base max-w-[90%] sm:max-w-[80%]`}>
              {isBot ? (
                <div className="bot-response-container prose prose-invert prose-sm sm:prose-base max-w-none flex flex-col gap-2">
                  {!isThinking && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">
                      <CheckCircle2 size={12} /> execution completed
                    </div>
                  )}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div className="relative my-4 rounded-xl overflow-hidden border border-violet-500/20 bg-black/40">
                            <div className="bg-black/60 px-4 py-1.5 text-[10px] text-violet-300/60 flex justify-between items-center border-b border-violet-500/10">
                              <span className="font-mono uppercase">{match[1]} output</span>
                              <Terminal size={12} />
                            </div>
                            <SyntaxHighlighter 
                              style={vscDarkPlus} 
                              language={match[1]} 
                              PreTag="div" 
                              customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8rem', background: 'transparent' }} 
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="bg-violet-500/10 px-1.5 py-0.5 rounded text-violet-300" {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>

                  {msg.latency_ms && (
                    <div className="msg-meta flex gap-3 text-[10px] opacity-40 mt-2 font-mono">
                      <span>⚡ {(msg.latency_ms / 1000).toFixed(2)}s</span>
                      <span>🤖 {msg.model || 'mistral'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 font-mono text-violet-100">
                   <Zap size={14} className="text-violet-400 shrink-0" /> {msg.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area p-4 sm:p-6 flex flex-col gap-3 relative">
        {imageFile && (
          <div className="absolute -top-12 left-6 bg-violet-600 p-2 px-4 rounded-full text-xs flex items-center gap-2 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <ImageIcon size={14} /> 
            <span className="max-w-[150px] truncate">{imageFile.name}</span>
            <button onClick={() => setImageFile(null)}>✕</button>
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

            <label className="btn btn-secondary p-3 rounded-xl cursor-pointer bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20">
              <ImageIcon size={20} className="text-violet-400" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
            </label>
          </div>
          
          <div className="flex-1 flex gap-2 sm:gap-3 bg-black/20 p-1 rounded-2xl border border-white/5 focus-within:border-violet-500/50 transition-colors">
            <input 
              type="text" 
              placeholder={recording ? "Recording..." : "Define agent task..." }
              className="flex-1 bg-transparent border-none p-3 text-sm sm:text-base outline-none font-mono disabled:opacity-50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={recording}
            />
            <button 
              className="btn h-10 w-10 sm:h-12 sm:w-auto sm:px-6 rounded-xl shrink-0 !bg-violet-600 hover:!bg-violet-500" 
              onClick={() => handleSend()} 
              disabled={loading || recording || (!input.trim() && !imageFile)}
            >
              <Zap size={18} /> <span className="hidden sm:inline">Execute</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
