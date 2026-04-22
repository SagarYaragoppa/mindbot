import React from 'react';
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
    <div className="main-chat mode-agent">
      {/* Header */}
      <div className="mode-header">
        <div className="mode-header-left">
          <span className="mode-badge agent-badge">Autonomous Agent</span>
          <h3 className="mode-title" style={{ color: '#ede9fe' }}>Task Execution</h3>
        </div>
        <div className="mode-header-right">
          <button className="clear-btn" onClick={handleClearChat} title="Reset Agent">
            <Trash2 size={13} /> Reset
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontFamily: 'monospace', color: '#c4b5fd', opacity: 0.8 }}>
            <Cpu size={13} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Processing...' : 'Awaiting Task'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-history">
        {messages.map((msg, idx) => {
          const isBot = msg.role === 'bot';
          const isThinking = msg.content === 'Thinking...';

          return (
            <div key={idx} className={`message ${msg.role}`}>
              {isBot ? (
                <div className="bot-response-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {!isThinking && (
                    <div className="execution-label">
                      <CheckCircle2 size={11} /> Execution Complete
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div style={{ margin: '0.75rem 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(0,0,0,0.4)' }}>
                            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '0.4rem 1rem', fontSize: '0.68rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(139,92,246,0.1)', color: 'rgba(196,181,253,0.6)' }}>
                              <span style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>{match[1]} output</span>
                              <Terminal size={11} />
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
                          <code style={{ background: 'rgba(139,92,246,0.1)', padding: '0.15rem 0.4rem', borderRadius: '5px', color: '#c4b5fd', fontSize: '0.85em' }} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {msg.latency_ms && (
                    <div className="msg-meta">
                      <span>⚡ {(msg.latency_ms / 1000).toFixed(2)}s</span>
                      <span>🤖 {msg.model || 'mistral'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: 'monospace', color: '#ede9fe' }}>
                  <Zap size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {imageFile && (
          <div className="image-badge" style={{ background: '#7c3aed' }}>
            <ImageIcon size={13} />
            <span>{imageFile.name}</span>
            <button onClick={() => setImageFile(null)}>✕</button>
          </div>
        )}
        {recording && (
          <div className="listening-badge">
            <Mic size={13} /> Listening...
          </div>
        )}

        <div className="chat-input-row">
          <div className="chat-input-left-btns">
            {isSpeechSupported && (
              <button
                className={`btn btn-icon${recording ? ' pulse-animation' : ' btn-secondary'}`}
                onClick={toggleRecording}
                disabled={loading}
              >
                {recording ? <Square size={18} /> : <Mic size={18} />}
              </button>
            )}
            <label
              className="btn btn-secondary btn-icon"
              style={{ cursor: 'pointer', background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.2)' }}
              title="Attach image"
            >
              <ImageIcon size={18} style={{ color: '#a78bfa' }} />
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setImageFile(e.target.files[0])} />
            </label>
          </div>

          <div className="chat-input-box">
            <input
              type="text"
              placeholder={recording ? 'Recording...' : 'Define agent task...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={recording}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <button
            className="btn chat-send-btn"
            style={{ background: '#7c3aed' }}
            onClick={() => handleSend()}
            disabled={loading || recording || (!input.trim() && !imageFile)}
          >
            <Zap size={16} /> <span>Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
}
