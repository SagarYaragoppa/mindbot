import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import GeneralChatView from './modes/GeneralChatView';
import RagChatView from './modes/RagChatView';
import AgentChatView from './modes/AgentChatView';

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
    if (loading) return;

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

    let memoryPrompt = "";
    try {
      const recentMessages = messages
        .filter(m => m.content !== 'Thinking...' && m.content !== 'Hello! How can I help you today?')
        .slice(-6); 
      
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
        let endpoint = `${import.meta.env.VITE_API_BASE_URL}/ask-rag`;
        let payload = { message: textToSend };

        if (mode === 'agent') {
          endpoint = `${import.meta.env.VITE_API_BASE_URL}/agent`;
          payload = { task: finalPayloadText, model: llmModel, temperature: temperature };
        } else {
          payload = { message: finalPayloadText };
        }
        
        const res = await axios.post(endpoint, payload);
        clearTimeout(timeoutId);
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

  const commonProps = {
    messages, input, setInput, handleSend, loading, recording, 
    toggleRecording, imageFile, setImageFile, isSpeechSupported, 
    endOfMessagesRef, hasDocs
  };

  if (mode === 'rag') {
    return <RagChatView {...commonProps} />;
  } else if (mode === 'agent') {
    return <AgentChatView {...commonProps} />;
  } else {
    return <GeneralChatView {...commonProps} />;
  }
}
