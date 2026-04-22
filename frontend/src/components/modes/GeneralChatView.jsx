import React from 'react';
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
    <div className="main-chat mode-chat">
      {/* Header */}
      <div className="mode-header">
        <div className="mode-header-left">
          <span className="mode-badge chat-badge">General</span>
          <h3 className="mode-title">MindBot Chat</h3>
        </div>
        <div className="mode-header-right">
          {/* Mode toggle */}
          <div className="toggle-container">
            <span className={`toggle-label${mode === 'chat' ? ' active' : ''}`}>General</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={mode === 'rag'}
                onChange={(e) => setMode(e.target.checked ? 'rag' : 'chat')}
              />
              <span className="slider" />
            </label>
            <span className={`toggle-label${mode === 'rag' ? ' active' : ''}`}>Docs</span>
          </div>
          <button className="clear-btn" onClick={handleClearChat} title="Clear Chat">
            <Trash2 size={13} /> Reset
          </button>
          <Bot size={18} style={{ opacity: 0.3 }} />
        </div>
      </div>

      {/* Messages */}
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.role === 'bot' ? (
              <div className="bot-response-container">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div style={{ position: 'relative', margin: '0.75rem 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.4rem 1rem', fontSize: '0.68rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{match[1]}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(String(children))}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Copy
                            </button>
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
                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.4rem', borderRadius: '5px', color: 'var(--accent-color)', fontSize: '0.85em' }} {...props}>
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
            ) : msg.content}
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {imageFile && (
          <div className="image-badge">
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
                title={recording ? 'Stop recording' : 'Start voice input'}
              >
                {recording ? <Square size={18} /> : <Mic size={18} />}
              </button>
            )}
            <label className="btn btn-secondary btn-icon" style={{ cursor: 'pointer' }} title="Attach image">
              <ImageIcon size={18} />
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setImageFile(e.target.files[0])} />
            </label>
          </div>

          <div className="chat-input-box">
            <input
              type="text"
              placeholder={recording ? 'Recording...' : 'Message MindBot...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={recording}
            />
          </div>

          <button
            className="btn chat-send-btn"
            onClick={() => handleSend()}
            disabled={loading || recording || (!input.trim() && !imageFile)}
          >
            <Send size={16} /> <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
