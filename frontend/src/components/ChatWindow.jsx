import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import GeneralChatView from './modes/GeneralChatView';
import RagChatView from './modes/RagChatView';
import AgentChatView from './modes/AgentChatView';

// ---------------------------------------------------------------------------
// Safety filter: detect garbled / symbol-heavy output and replace it
// ---------------------------------------------------------------------------
function cleanResponse(text) {
  if (!text || typeof text !== 'string') return 'Something went wrong. Please try again.';
  const trimmed = text.trim();
  if (!trimmed) return 'Something went wrong. Please try again.';

  // Count non-alphanumeric, non-whitespace, non-basic-punctuation characters
  const symbolCount = (trimmed.match(/[^\w\s.,!?;:'"()\-\[\]{}@#$%&*+=/<>\\|`~^]/g) || []).length;
  const ratio = symbolCount / Math.max(trimmed.length, 1);

  // If more than 30% of chars are symbols/garbage → reject
  if (ratio > 0.30) return 'Something went wrong. Please try again.';

  // Strip null / undefined literals that sometimes leak in
  const cleaned = trimmed.replace(/\b(null|undefined)\b/g, '').trim();
  return cleaned || 'Something went wrong. Please try again.';
}

export default function ChatWindow({ mode, setMode, token, activeConversationId, llmModel, temperature, provider }) {
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
  const isManuallyStoppedRef = useRef(true);
  const baseInputRef = useRef('');
  const [isSpeechSupported] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Initialize Speech Recognition
  useEffect(() => {
    if (isSpeechSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log("Speech started");
        setRecording(true);
      };

      recognition.onresult = (event) => {
        console.log("Speech result:", event);
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }
        // Append session transcript to what was already in the input box when recording started
        const combined = baseInputRef.current + (baseInputRef.current && sessionTranscript ? ' ' : '') + sessionTranscript;
        setInput(combined);
      };

      recognition.onend = () => {
        console.log("Speech ended");
        // If not manually stopped, restart recognition
        if (!isManuallyStoppedRef.current) {
          try {
            recognition.start();
          } catch (err) {
            // Silently fail if already starting
          }
        } else {
          setRecording(false);
        }
      };

      recognition.onerror = (event) => {
        console.log("Speech error:", event.error);
        if (event.error === 'no-speech') {
          return; // Ignore silently
        }
        
        console.error('Speech recognition error details:', event.error);

        if (event.error === 'not-allowed') {
          isManuallyStoppedRef.current = true;
          setMessages(prev => [...prev, { role: 'bot', content: '🔒 Microphone access denied.' }]);
          setRecording(false);
        } else {
          // For major errors, stop
          isManuallyStoppedRef.current = true;
          setRecording(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isSpeechSupported]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const [fetchErrorCount, setFetchErrorCount] = useState(0);

  useEffect(() => {
    if (!activeConversationId || !token || fetchErrorCount > 2) return;

    let isMounted = true;

    const loadData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/conversations/${activeConversationId}/messages`);
        if (isMounted) {
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
          setFetchErrorCount(0);
        }
      } catch (err) {
        console.error("Failed to load conversation messages:", err);
        if (isMounted) setFetchErrorCount(prev => prev + 1);
      }

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/list-docs`);
        if (isMounted) {
          setHasDocs(res.data.documents && res.data.documents.length > 0);
          setFetchErrorCount(0);
        }
      } catch (err) {
        console.error("KB check failed:", err);
        if (isMounted) setFetchErrorCount(prev => prev + 1);
      }
    };

    loadData();
    setImageFile(null);

    return () => { isMounted = false; };
  }, [activeConversationId, token, mode, fetchErrorCount < 3]); 

  const toggleRecording = () => {
    if (!isSpeechSupported || !recognitionRef.current) return;
    if (loading) return;

    if (recording) {
      isManuallyStoppedRef.current = true;
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      isManuallyStoppedRef.current = false;
      baseInputRef.current = input; // Capture existing text to avoid overwriting
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Speech recognition already active:", err);
      }
    }
  };

  const handleSend = async (userTextOverride = null) => {
    const textToSend = userTextOverride || input.trim();
    if (!textToSend && !imageFile) return;
    if (loading) return;

    // NOTE: Memory is managed server-side via conversation_id.
    // Do NOT prepend previous context here — that causes recursive memory loops.
    const finalPayloadText = textToSend;
    let displayMsg = textToSend;
    if (imageFile && textToSend) displayMsg = `[🖼️ Image attached]: ${textToSend}`;
    else if (imageFile) displayMsg = `[🖼️ Image attached]`;

    if (!userTextOverride) {
      setMessages(prev => [...prev, { role: 'user', content: displayMsg }, { role: 'bot', content: 'Thinking...' }]);
    } else {
      setMessages(prev => [...prev, { role: 'bot', content: 'Thinking...' }]);
    }
    
    setInput('');
    setLoading(true);

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
        const formData = new FormData();
        formData.append('file', imageFile);
        
        let endpoint = `${import.meta.env.VITE_API_BASE_URL}/vision`;
        if (mode === 'agent') {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/agent`;
          formData.append('task', finalPayloadText);
          if (activeConversationId) formData.append('conversation_id', activeConversationId);
          formData.append('model', llmModel);
          formData.append('provider', provider);
          formData.append('temperature', temperature);
        } else {
          if (textToSend) formData.append('prompt', textToSend);
        }
        const res = await axios.post(endpoint, formData);
        clearTimeout(timeoutId);
        
        const reply = cleanResponse(res.data.reply || res.data.response || '');
        const metadata = {
          latency_ms: res.data.latency_ms,
          model: res.data.model,
          provider: res.data.provider
        };
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1].content === 'Thinking...') {
            newMessages[newMessages.length - 1] = { role: 'bot', content: reply, ...metadata };
          } else {
            newMessages.push({ role: 'bot', content: reply, ...metadata });
          }
          return newMessages;
        });
        setImageFile(null);
        
      } else if (mode === 'chat') {
        const startTime = Date.now();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            message: finalPayloadText, 
            conversation_id: activeConversationId, 
            model: llmModel, 
            provider: provider,
            temperature: temperature 
          })
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
                   newMessages[newMessages.length - 1] = { role: 'bot', content: '', model: llmModel, provider: provider };
                 } else {
                   newMessages.push({ role: 'bot', content: '', model: llmModel, provider: provider });
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
              const updatedMsg = { ...lastMsg, content: lastMsg.content + chunkValue };
              
              if (done) {
                updatedMsg.latency_ms = Date.now() - startTime;
              }
              
              newMessages[lastIndex] = updatedMsg;
              return newMessages;
            });
          }
        }
      } else {
        const startTime = Date.now();
        let endpoint = `${import.meta.env.VITE_API_BASE_URL}/ask-rag`;
        let payload = { message: textToSend };

        if (mode === 'agent') {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/agent`;
          const formData = new FormData();
          formData.append('task', finalPayloadText);
          if (activeConversationId) formData.append('conversation_id', activeConversationId);
          formData.append('model', llmModel);
          formData.append('provider', provider);
          formData.append('temperature', temperature);
          payload = formData;
        } else {
          payload = { 
            message: finalPayloadText,
            conversation_id: activeConversationId,
            model: llmModel,
            provider: provider
          };
        }
        
        const res = await axios.post(endpoint, payload);
        clearTimeout(timeoutId);
        
        const rawReply = res.data.response || res.data.reply || res.data.message || res.data.answer || '';
        const reply = cleanResponse(rawReply);
        const metadata = {
          latency_ms: res.data.latency_ms || (Date.now() - startTime),
          model: res.data.model || llmModel,
          provider: res.data.provider || provider
        };
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1].content === 'Thinking...') {
            newMessages[newMessages.length - 1] = { role: 'bot', content: reply, ...metadata };
          } else {
            newMessages.push({ role: 'bot', content: reply, ...metadata });
          }
          return newMessages;
        });
      }
    } catch (err) {
      console.error(err);
      clearTimeout(timeoutId);
      setMessages(prev => {
        const newMessages = [...prev];
        const errorMsg = 'Something went wrong. Please try again.';
        if (newMessages[newMessages.length - 1]?.content === 'Thinking...') {
          newMessages[newMessages.length - 1] = { role: 'bot', content: errorMsg };
        } else {
          newMessages.push({ role: 'bot', content: errorMsg });
        }
        return newMessages;
      });
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  const handleClearChat = async () => {
    if (!activeConversationId || !token) return;
    if (!window.confirm("Are you sure you want to clear the chat history? This cannot be undone.")) return;

    try {
      setLoading(true);
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/conversations/${activeConversationId}/messages`);
      setMessages([{ role: 'bot', content: 'Conversation history cleared. How can I help you now?' }]);
    } catch (err) {
      console.error("Failed to clear chat:", err);
      alert("Failed to clear chat history.");
    } finally {
      setLoading(false);
    }
  };

  const commonProps = {
    messages, input, setInput, handleSend, handleClearChat, loading, recording, 
    toggleRecording, imageFile, setImageFile, isSpeechSupported, 
    endOfMessagesRef, hasDocs, mode, setMode
  };

  if (mode === 'rag') {
    return <RagChatView {...commonProps} />;
  } else if (mode === 'agent') {
    return <AgentChatView {...commonProps} />;
  } else {
    return <GeneralChatView {...commonProps} />;
  }
}
