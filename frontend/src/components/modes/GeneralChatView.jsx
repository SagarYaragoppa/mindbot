import React from 'react';
import { Send, Mic, Square, Image as ImageIcon, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function GeneralChatView({ 
  messages, input, setInput, handleSend, loading, recording, 
  toggleRecording, imageFile, setImageFile, isSpeechSupported, endOfMessagesRef 
}) {
  return (
    <div className="main-chat mode-chat">
      <div className="mode-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="mode-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid #3b82f6' }}>General</div>
          <h3 style={{ margin: 0, fontWeight: 600 }}>MindBot Chat</h3>
        </div>
        <Bot size={20} style={{ opacity: 0.5 }} />
      </div>
      
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.role === 'bot' ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: '#1e1e1e', padding: '4px 12px', fontSize: '0.75rem', color: '#888', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
                          <span>{match[1]}</span>
                          <button onClick={() => navigator.clipboard.writeText(String(children))} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>Copy</button>
                        </div>
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
                {msg.content}
              </ReactMarkdown>
            ) : msg.content}
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area" style={{ position: 'relative' }}>
        {imageFile && (
          <div style={{ position: 'absolute', top: '-40px', left: '10px', background: 'var(--accent-color)', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <ImageIcon size={14} /> {imageFile.name}
            <button onClick={() => setImageFile(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        
        {recording && <div className="listening-indicator">Listening...</div>}

        {isSpeechSupported && (
          <button className={`btn ${recording ? 'pulse-animation' : 'btn-secondary'}`} style={{ padding: '0.75rem' }} onClick={toggleRecording} disabled={loading}>
            {recording ? <Square size={20} /> : <Mic size={20} />}
          </button>
        )}
        
        <label className="btn btn-secondary" style={{ padding: '0.75rem', cursor: 'pointer' }}>
          <ImageIcon size={20} />
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setImageFile(e.target.files[0])} />
        </label>

        <input 
          type="text" 
          placeholder={recording ? "Recording..." : "Type a message..." }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={recording}
        />
        <button className="btn" onClick={() => handleSend()} disabled={loading || recording}>
          <Send size={18} /> Send
        </button>
      </div>
    </div>
  );
}
