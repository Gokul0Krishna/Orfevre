import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sendChatMessage } from '../api';

const GREETINGS = {
  en: "Hi! I'm Sahayak 👋\nI can help you navigate YuvaShakti. Ask me anything!",
  hi: "नमस्ते! मैं सहायक हूँ 👋\nमैं YuvaShakti में आपकी मदद कर सकता हूँ।",
  mr: "नमस्कार! मी सहायक आहे 👋\nमी YuvaShakti मध्ये तुम्हाला मदत करू शकतो.",
  kn: "ನಮಸ್ಕಾರ! ನಾನು ಸಹಾಯಕ 👋\nYuvaShakti ನಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.",
  ta: "வணக்கம்! நான் சஹாயக் 👋\nYuvaShakti-ல் உங்களுக்கு உதவ முடியும்.",
};

const DEFAULT_SUGGESTIONS = {
  en: ["How do I find jobs?", "How to verify skills?", "What is BazaarPulse?"],
  hi: ["नौकरी कैसे खोजें?", "कौशल कैसे सत्यापित करें?", "बाज़ार-पल्स क्या है?"],
  mr: ["नोकरी कशी शोधायची?", "कौशल्य कसे सत्यापित करायचे?", "बाजार-पल्स म्हणजे काय?"],
  kn: ["ಕೆಲಸ ಹೇಗೆ ಹುಡುಕುವುದು?", "ಕೌಶಲ್ಯ ಹೇಗೆ ಪರಿಶೀಲಿಸುವುದು?", "ಬಜಾರ್-ಪಲ್ಸ್ ಎಂದರೇನು?"],
  ta: ["வேலை எப்படி கண்டுபிடிப்பது?", "திறன் எப்படி சரிபார்ப்பது?", "பஜார்-பல்ஸ் என்றால் என்ன?"],
};

const PLACEHOLDERS = {
  en: "Ask me anything...",
  hi: "अपना सवाल पूछें...",
  mr: "तुमचा प्रश्न विचारा...",
  kn: "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ...",
  ta: "உங்கள் கேள்வியைக் கேளுங்கள்...",
};

const ChatbotWidget = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showPulse, setShowPulse] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize greeting on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'bot', content: GREETINGS[lang] || GREETINGS.en }]);
      setSuggestions(DEFAULT_SUGGESTIONS[lang] || DEFAULT_SUGGESTIONS.en);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setShowPulse(false);
    }
  }, [isOpen]);

  const handleSend = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setIsLoading(true);
    setSuggestions([]);

    try {
      const res = await sendChatMessage(msg, lang);
      setMessages(prev => [...prev, { role: 'bot', content: res.reply }]);
      if (res.suggestions?.length) setSuggestions(res.suggestions);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "Sorry, I couldn't connect. Please try again. 🙏"
      }]);
      setSuggestions(DEFAULT_SUGGESTIONS[lang] || DEFAULT_SUGGESTIONS.en);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, lang]);

  return (
    <>
      {/* ── FAB Button ── */}
      <button
        id="chatbot-fab"
        onClick={() => setIsOpen(v => !v)}
        aria-label="Chat with Sahayak"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #007B55, #00A878)',
          boxShadow: '0 6px 24px rgba(0,123,85,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen
          ? <ChevronDown size={24} color="#fff" />
          : <MessageCircle size={24} color="#fff" />
        }
        {!isOpen && showPulse && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#F97316', border: '2px solid #fff',
            animation: 'pulse 1.5s infinite',
          }} />
        )}
      </button>

      {/* ── Chat Panel ── */}
      <div style={{
        position: 'fixed', bottom: 90, right: 24, zIndex: 9998,
        width: 370, maxWidth: 'calc(100vw - 32px)',
        height: 500, maxHeight: 'calc(100vh - 120px)',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(12px)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'transform 0.2s ease, opacity 0.15s ease',
        display: 'flex', flexDirection: 'column', background: '#fff',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #007B55, #00A878)',
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Sahayak</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86EFAC', display: 'inline-block' }} />
              YuvaShakti Assistant
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
          background: '#F7F8FA', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
              {m.role === 'bot' && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: 'linear-gradient(135deg, #007B55, #00A878)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={13} color="#fff" />
                </div>
              )}
              <div style={{
                maxWidth: '78%', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.55,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: m.role === 'user' ? '#007B55' : '#fff',
                color: m.role === 'user' ? '#fff' : '#1a1a1a',
                border: m.role === 'bot' ? '1px solid #e5e7eb' : 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #007B55, #00A878)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={13} color="#fff" />
              </div>
              <div style={{
                background: '#fff', padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
                border: '1px solid #e5e7eb', display: 'flex', gap: 5,
              }}>
                {[0, 1, 2].map(j => (
                  <span key={j} style={{
                    width: 7, height: 7, borderRadius: '50%', background: '#c4c4c4',
                    animation: `bounce 0.6s ${j * 0.15}s infinite alternate`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !isLoading && (
          <div style={{
            padding: '6px 12px', display: 'flex', gap: 6, overflowX: 'auto',
            borderTop: '1px solid #f0f0f0', background: '#fff', flexShrink: 0,
          }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)} style={{
                whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                padding: '5px 12px', borderRadius: 20, flexShrink: 0,
                border: '1px solid rgba(0,123,85,0.25)', background: 'rgba(0,123,85,0.05)',
                color: '#007B55', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,123,85,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,123,85,0.05)'}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 14px 12px', background: '#fff', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f3f4f6', borderRadius: 24, padding: '4px 4px 4px 16px',
            border: '1px solid #e5e7eb',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={PLACEHOLDERS[lang] || PLACEHOLDERS.en}
              disabled={isLoading}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 13.5, color: '#1a1a1a', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: input.trim() ? 'linear-gradient(135deg, #007B55, #00A878)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: input.trim() ? 1 : 0.3, transition: 'all 0.15s',
              }}
            >
              <Send size={15} color={input.trim() ? '#fff' : '#9ca3af'} />
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 10, color: '#aaa', marginTop: 6, fontWeight: 500 }}>
            Powered by Google Translate ✨
          </p>
        </div>
      </div>

      {/* Keyframe for bounce animation */}
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;
