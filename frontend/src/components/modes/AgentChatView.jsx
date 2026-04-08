import React from 'react';
import { Send, Mic, Square, Cpu, Terminal, Zap, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function AgentChatView({ 
  messages, input, setInput, handleSend, loading, recording, 
  toggleRecording, isSpeechSupported, endOfMessagesRef 
}) {
  return (
    <div className="main-chat mode-agent">
      <div className="mode-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="mode-badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', border: '1px solid #8b5cf6' }}>Autonomous Agent</div>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Task Execution</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, fontSize: '0.85rem' }}>
          <Cpu size={16} className={loading ? 'spin-animation' : ''} />
          {loading ? 'Processing Task...' : 'Awaiting Task'}
        </div>
      </div>
      
      <div className="chat-history">
        {messages.map((msg, idx) => {
          const isBot = msg.role === 'bot';
          const isThinking = msg.content === 'Thinking...';
          
          return (
            <div key={idx} className={`message ${msg.role}`}>
              {isBot ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!isThinking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#a78bfa', marginBottom: '4px' }}>
                      <CheckCircle2 size={12} /> execution completed
                    </div>
                  )}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ background: '#1e1e1e', padding: '4px 12px', fontSize: '0.75rem', color: '#888', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
                              <span>{match[1]} output</span>
                              <Terminal size={14} />
                            </div>
                            <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0 }} {...props}>
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={className} style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '2px 4px', borderRadius: '4px', color: '#c4b5fd' }} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Zap size={14} style={{ color: '#fff' }} /> {msg.content}
                </div>
              )}
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
          placeholder={recording ? "Recording..." : "Define an agent task..." }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={recording}
          style={{ fontFamily: 'monospace' }}
        />
        <button className="btn" onClick={() => handleSend()} disabled={loading || recording} style={{ background: '#8b5cf6' }}>
          <Zap size={18} /> Execute
        </button>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
