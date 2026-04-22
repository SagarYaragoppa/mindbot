import React from 'react';
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
      {/* Header */}
      <div className="mode-header">
        <div className="mode-header-left">
          <span className="mode-badge rag-badge">Knowledge Base</span>
          <h3 className="mode-title">Document Q&amp;A</h3>
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

          <div className={`db-status${hasDocs ? ' active' : ' inactive'}`}>
            <Database size={13} />
            <span>{hasDocs ? 'Store Active' : 'No Docs'}</span>
          </div>
        </div>
      </div>

      {/* No docs warning */}
      {!hasDocs && (
        <div className="no-docs-banner">
          ⚠️ No documents indexed. Standard chat will be used until files are uploaded.
        </div>
      )}

      {/* Messages */}
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

          const renderWithHighlights = (text) => {
            const lastUserMsg = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
            const query = lastUserMsg ? lastUserMsg.content.toLowerCase() : '';
            const words = query.split(/\s+/).filter(w => w.length > 3);
            if (words.length === 0) return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;

            let highlighted = text;
            words.forEach(word => {
              const regex = new RegExp(`(${word})`, 'gi');
              highlighted = highlighted.replace(regex, '<mark style="background:rgba(234,179,8,0.2);color:inherit;border-bottom:1px solid rgba(234,179,8,0.6);border-radius:2px;">$1</mark>');
            });
            return <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: highlighted }} />;
          };

          return (
            <div key={idx} className={`message ${msg.role}`}>
              {isBot ? (
                <div className="bot-response-container">
                  {sourceContent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#34d399', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>
                      <FileText size={11} /> Document Based Response
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div style={{ margin: '0.75rem 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
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
                          <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.4rem', borderRadius: '5px', color: '#34d399', fontSize: '0.85em' }} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {mainContent}
                  </ReactMarkdown>

                  {msg.latency_ms && (
                    <div className="msg-meta">
                      <span>⚡ {(msg.latency_ms / 1000).toFixed(2)}s</span>
                      <span>🤖 {msg.model || 'mistral'}</span>
                    </div>
                  )}

                  {sourceContent && (
                    <div className="source-section">
                      <div className="source-header">
                        <Search size={13} /> Citations &amp; Sources
                      </div>
                      <div className="source-content">
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

      {/* Input area */}
      <div className="chat-input-area">
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
          </div>

          <div className="chat-input-box" style={{ '--focus-color': 'rgba(16,185,129,0.5)' }}>
            <input
              type="text"
              placeholder={recording ? 'Recording...' : 'Ask your documents...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={recording}
            />
          </div>

          <button
            className="btn chat-send-btn"
            style={{ background: '#059669' }}
            onClick={() => handleSend()}
            disabled={loading || recording || !input.trim()}
          >
            <Search size={16} /> <span>Query</span>
          </button>
        </div>
      </div>
    </div>
  );
}
