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
  
  const endOfMessagesRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
  }, [activeConversationId, token, mode]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'record.webm');

        try {
          // Provide visual hint on the input box
          setInput('Transcribing audio...');
          
          const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/voice-transcribe`, formData);
          const transcribedText = res.data.text;
          
          if (!transcribedText || transcribedText.trim() === '') {
             setInput(prev => (prev === 'Transcribing audio...' ? '' : prev) + ' [Audio was silent or unclear]');
          } else {
             setInput(prev => (prev === 'Transcribing audio...' ? '' : prev + ' ') + transcribedText);
          }
        } catch (err) {
          console.error(err);
          setInput('');
          setMessages(prev => [...prev, { role: 'bot', content: 'Error transcribing audio.' }]);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Error accessing mic", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSend = async (userTextOverride = null) => {
    const textToSend = userTextOverride || input.trim();
    if (!textToSend && !imageFile) return;
    
    // Optimistic UI for User
    let displayMsg = textToSend;
    if (imageFile && textToSend) displayMsg = `[🖼️ Image attached]: ${textToSend}`;
    else if (imageFile) displayMsg = `[🖼️ Image attached]`;

    if (!userTextOverride) {
      setMessages(prev => [...prev, { role: 'user', content: displayMsg }]);
    }
    
    setInput('');
    setLoading(true);

    try {
      if (imageFile) {
        // VISION MODE
        const formData = new FormData();
        formData.append('file', imageFile);
        if (textToSend) formData.append('prompt', textToSend);

        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/vision`, formData);
        setMessages(prev => [...prev, { role: 'bot', content: res.data.reply }]);
        setImageFile(null);
        
      } else if (mode === 'chat') {
        // STREAMING CHAT
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: textToSend, conversation_id: activeConversationId, model: llmModel, temperature: temperature })
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
               setLoading(false);
               setMessages(prev => [...prev, { role: 'bot', content: '' }]);
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
        let payload = { question: textToSend };

        if (mode === 'agent') {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/agent`;
          payload = { task: textToSend, model: llmModel, temperature: temperature };
        }
        
        const res = await axios.post(endpoint, payload);
        setMessages(prev => [...prev, { role: 'bot', content: res.data.reply }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error answering that.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-chat glass-panel">
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ textTransform: 'capitalize' }}>{mode} Mode</h3>
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
                {msg.content}
              </ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && <div className="message bot" style={{ opacity: 0.7 }}>Thinking... (this might take a few seconds if the server is waking up)</div>}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-area" style={{ position: 'relative' }}>
        {imageFile && (
          <div style={{ position: 'absolute', top: '-40px', left: '10px', background: 'var(--accent-color)', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', color: '#fff' }}>
            <ImageIcon size={14} /> {imageFile.name}
            <button onClick={() => setImageFile(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }}>✕</button>
          </div>
        )}
        
        {!recording ? (
          <button className="btn btn-secondary" style={{ padding: '0.75rem' }} title="Voice Input" onClick={startRecording}>
            <Mic size={20} />
          </button>
        ) : (
          <button className="btn" style={{ padding: '0.75rem', background: '#ef4444' }} onClick={stopRecording}>
            <Square size={20} />
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
