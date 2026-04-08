import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Mic, Square, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ChatWindow({ mode, token, activeConversationId, llmModel, temperature }) {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hello! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [hasDocs, setHasDocs] = useState(false);
  
  const endOfMessagesRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isSpeechSupported] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Initialize Speech Recognition
  useEffect(() => {
    if (isSpeechSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => {
            const newVal = (prev.trim() ? prev + ' ' : '') + transcript;
            return newVal;
          });
        }
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setRecording(false);
        if (event.error === 'not-allowed') {
          setMessages(prev => [...prev, { role: 'bot', content: '❌ Microphone access denied. Please enable permission in your browser.' }]);
        } else if (event.error === 'no-speech') {
          // ignore no-speech
        } else {
          setMessages(prev => [...prev, { role: 'bot', content: `⚠️ Voice Input Error: ${event.error}` }]);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isSpeechSupported]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (activeConversationId && token) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/conversations/${activeConversationId}/messages`)
        .then(res => {
          if (res.data.length === 0) {
            setMessages([{ role: 'bot', content: `Started new ${mode} conversation.` }]);
          } else {
            const mapped = [];
            res.data.forEach(m => {
              mapped.push({ role: 'user', content: m.message });
              if (m.response) mapped.push({ role: 'bot', content: m.response });
            });
            setMessages(mapped);
          }
        })
        .catch(err => console.error("Failed to load conversation messages:", err));
    }
    setImageFile(null);

    // Check if KB exists for Mode Indicator
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/list-docs`)
      .then(res => {
        setHasDocs(res.data.documents && res.data.documents.length > 0);
      })
      .catch(err => console.error("KB check failed:", err));
  }, [activeConversationId, token, mode]);

  const toggleRecording = () => {
    if (!isSpeechSupported) return;
    if (loading) return; // Prevent mic use while AI is thinking

    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setRecording(true);
      } catch (err) {
        console.error("Mic start failed", err);
        setRecording(false);
      }
    }
  };

  const handleSend = async (userTextOverride = null) => {
    const textToSend = userTextOverride || input.trim();
    if (!textToSend && !imageFile) return;
    if (loading) return;

    // LIGHTWEIGHT CHAT MEMORY (Frontend Only)
    // Prepend last 3 messages to current prompt for context
    let memoryPrompt = "";
    try {
      const recentMessages = messages
        .filter(m => m.content !== 'Thinking...' && m.content !== 'Hello! How can I help you today?')
        .slice(-6); // last 3 pairs
      
      if (recentMessages.length > 0) {
        memoryPrompt = "Previous context:\n" + 
          recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n") + 
          "\n\nCurrent Message: ";
      }
    } catch (e) {
      console.error("Memory fallback:", e);
      memoryPrompt = "";
    }

    const finalPayloadText = memoryPrompt + textToSend;
    
    // Optimistic UI for User
    let displayMsg = textToSend;
    if (imageFile && textToSend) displayMsg = `[🖼️ Image attached]: ${textToSend}`;
    else if (imageFile) displayMsg = `[🖼️ Image attached]`;

    // Immediately add user message AND Thinking... placeholder
    if (!userTextOverride) {
      setMessages(prev => [...prev, { role: 'user', content: displayMsg }, { role: 'bot', content: 'Thinking...' }]);
    } else {
      setMessages(prev => [...prev, { role: 'bot', content: 'Thinking...' }]);
    }
    
    setInput('');
    setLoading(true);

    // Timeout protection: 15 seconds
    const timeoutId = setTimeout(() => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'bot' && lastMsg.content === 'Thinking...') {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'bot', content: 'Response taking too long. Try again.' };
          return newMessages;
        }
        return prev;
      });
      setLoading(false);
    }, 15000);

    try {
      if (imageFile) {
        // VISION MODE
        const formData = new FormData();
        formData.append('file', imageFile);
        if (textToSend) formData.append('prompt', textToSend);

        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/vision`, formData);
        clearTimeout(timeoutId);
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1].content === 'Thinking...') {
            newMessages[newMessages.length - 1] = { role: 'bot', content: res.data.reply };
          } else {
            newMessages.push({ role: 'bot', content: res.data.reply });
          }
          return newMessages;
        });
        setImageFile(null);
        
      } else if (mode === 'chat') {
        // STREAMING CHAT
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: finalPayloadText, conversation_id: activeConversationId, model: llmModel, temperature: temperature })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let isFirstChunk = true;
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            if (isFirstChunk) {
               clearTimeout(timeoutId);
               setLoading(false);
               setMessages(prev => {
                 const newMessages = [...prev];
                 if (newMessages[newMessages.length - 1].content === 'Thinking...') {
                   newMessages[newMessages.length - 1] = { role: 'bot', content: '' };
                 } else {
                   newMessages.push({ role: 'bot', content: '' });
                 }
                 return newMessages;
               });
               isFirstChunk = false;
            }
            const chunkValue = decoder.decode(value);
            setMessages(prev => {
              const newMessages = [...prev];
              const lastIndex = newMessages.length - 1;
              const lastMsg = newMessages[lastIndex];
              newMessages[lastIndex] = { ...lastMsg, content: lastMsg.content + chunkValue };
              return newMessages;
            });
          }
        }
      } else {
        // RAG or AGENT modes
        let endpoint = `${import.meta.env.VITE_API_BASE_URL}/ask-rag`;
        // Backend expects 'message' field in /ask-rag
        let payload = { message: textToSend };

        if (mode === 'agent') {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/agent`;
          payload = { task: finalPayloadText, model: llmModel, temperature: temperature };
        } else {
          payload = { message: finalPayloadText };
        }
        
        console.log(`[${mode.toUpperCase()}] Request:`, endpoint, payload);
        
        const res = await axios.post(endpoint, payload);
        clearTimeout(timeoutId);
        
        console.log(`[${mode.toUpperCase()}] Response:`, res.data);

        // Robustly extract response from various possible fields
        const reply = res.data.response || res.data.reply || res.data.message || res.data.answer;
        
        if (reply) {
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[newMessages.length - 1].content === 'Thinking...') {
              newMessages[newMessages.length - 1] = { role: 'bot', content: reply };
            } else {
              newMessages.push({ role: 'bot', content: reply });
            }
            return newMessages;
          });
        } else {
          console.warn("No recognized content field in response:", res.data);
          setMessages(prev => {
            const newMessages = [...prev];
            const errorMsg = "Error: Received empty response from the server.";
            if (newMessages[newMessages.length - 1].content === 'Thinking...') {
              newMessages[newMessages.length - 1] = { role: 'bot', content: errorMsg };
            } else {
              newMessages.push({ role: 'bot', content: errorMsg });
            }
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error(err);
      clearTimeout(timeoutId);
      setMessages(prev => {
        const newMessages = [...prev];
        const errorMsg = 'Something went wrong. Please try again.';
        if (newMessages[newMessages.length - 1]?.content === 'Thinking...') {
          newMessages[newMessages.length - 1] = { role: 'bot', content: errorMsg };
        } else if (newMessages[newMessages.length - 1]?.content !== 'Response taking too long. Try again.') {
          newMessages.push({ role: 'bot', content: errorMsg });
        }
        return newMessages;
      });
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  return (
    <div className="main-chat glass-panel">
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasDocs ? (
            <><span title="RAG Active">📄</span> RAG Mode (Using Document)</>
          ) : (
            <><span title="Standard Chat">🟢</span> Chat Mode</>
          )}
        </h3>
      </div>
      
      <div className="chat-history">
        {messages.map((msg, idx) => {
          const isBot = msg.role === 'bot';
          let mainContent = msg.content;
          let sourceContent = null;

          if (isBot && mainContent.includes('\n\n---\nSources:')) {
            const parts = mainContent.split('\n\n---\nSources:');
            mainContent = parts[0];
            sourceContent = parts[1];
          }

          // Keyword Highlighting Logic
          const renderWithHighlights = (text) => {
            if (!isBot || !sourceContent) return text;
            const prevUserMsg = messages[idx - 1];
            if (!prevUserMsg || (prevUserMsg.role !== 'user' && idx > 0)) {
               // If there's no immediately preceding user msg, look for the most recent one
               const lastUser = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
               if (!lastUser) return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;
            }
            
            const lastUserMsg = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
            const query = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";
            const words = query.split(/\s+/).filter(w => w.length > 3);
            
            if (words.length === 0) return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;

            // Simple highlighting for the Sources section
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
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ background: '#1e1e1e', padding: '4px 12px', fontSize: '0.75rem', color: '#888', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333' }}>
                              <span>{match[1]}</span>
                              <button 
                                onClick={() => navigator.clipboard.writeText(String(children))} 
                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                                title="Copy to Clipboard"
                              >
                                Copy Code
                              </button>
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
                    {mainContent}
                  </ReactMarkdown>
                  
                  {sourceContent && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.8rem', color: '#aaa', fontStyle: 'italic' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#888' }}>Sources:</div>
                      {renderWithHighlights(sourceContent)}
                    </div>
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          );
        })}
        {/* Loading div removed as Thinking... is now a message object */}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area" style={{ position: 'relative' }}>
        {imageFile && (
          <div style={{ position: 'absolute', top: '-40px', left: '10px', background: 'var(--accent-color)', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: '#fff' }}>
            <ImageIcon size={14} /> {imageFile.name}
            <button onClick={() => setImageFile(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }}>✕</button>
          </div>
        )}
        
        {recording && <div className="listening-indicator">Listening...</div>}

        {isSpeechSupported && (
          <button 
            className={`btn ${recording ? 'pulse-animation' : 'btn-secondary'}`} 
            style={{ padding: '0.75rem' }} 
            title={recording ? "Stop Recording" : "Voice Input"} 
            onClick={toggleRecording}
            disabled={loading}
          >
            {recording ? <Square size={20} /> : <Mic size={20} />}
          </button>
        )}
        
        <label className="btn btn-secondary" style={{ padding: '0.75rem', cursor: 'pointer' }} title="Attach Image">
          <ImageIcon size={20} />
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={(e) => setImageFile(e.target.files[0])}
          />
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
