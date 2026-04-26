import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parseGig, postGig } from '../api';
import {
  Mic, MicOff, Loader2, CheckCircle,
  MapPin, Clock, Wallet, Briefcase, RefreshCw, Sparkles, X
} from 'lucide-react';

const TRADES = [
  "Tailor", "Carpenter", "Electronics Repair", "Potter", "Weaver",
  "Cobbler", "Blacksmith", "Farmer", "Plumbing", "Painting",
  "Photography", "General Labour", "Other"
];

/* ─── Animated Voice Bars (Google-style) ─────────────────── */
const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
const VoiceBars = () => (
  <div className="flex items-center justify-center gap-1.5 h-10">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="w-2 rounded-full"
        style={{
          backgroundColor: GOOGLE_COLORS[i],
          height: '20%',
          animation: `googleVoicePulse 0.5s ease-in-out infinite alternate`,
          animationDelay: `${i * 150}ms`,
        }}
      />
    ))}
    <style>{`
      @keyframes googleVoicePulse {
        from { height: 20%; opacity: 0.7; }
        to   { height: 100%; opacity: 1; }
      }
    `}</style>
  </div>
);

/* ─── Editable Gig Preview Form ──────────────────────────── */
const GigPreview = ({ gig, correctedInput, onConfirm, onReset, posting }) => {
  const [form, setForm] = useState({ ...gig });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="bg-white rounded-3xl border-2 border-[#2D6A4F]/30 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-[#2D6A4F] to-[#52B788] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold text-sm">Gemini AI Extracted — Edit & Confirm</span>
        </div>
        <span className="text-xs text-white/70 bg-white/20 px-2 py-1 rounded-full font-semibold">
          {Math.round((gig.confidence || 0.9) * 100)}% confidence
        </span>
      </div>

      {/* What Gemini heard */}
      {correctedInput && (
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
            Gemini understood:
          </p>
          <p className="text-xs text-gray-700 font-medium italic">"{correctedInput}"</p>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Job Title</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full mt-1 text-xl font-extrabold text-[#1D1C1D] border-b-2 border-gray-200 focus:border-[#2D6A4F] outline-none pb-1 bg-transparent"
          />
        </div>

        {/* Trade */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trade / Skill</label>
          <select
            value={form.trade}
            onChange={e => set('trade', e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/30 focus:border-[#2D6A4F]"
          >
            {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/30 resize-none"
          />
        </div>

        {/* Grid fields */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ['district', 'District', MapPin],
            ['area', 'Area / Locality', MapPin],
            ['budget', 'Budget (₹)', Wallet],
            ['duration', 'Duration', Clock],
          ].map(([key, label, Icon]) => (
            <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-1 mb-1">
                <Icon className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">{label}</span>
              </div>
              <input
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className="w-full text-sm font-bold text-gray-900 bg-transparent outline-none border-b border-gray-200 focus:border-[#2D6A4F] pb-0.5"
              />
            </div>
          ))}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Workers Needed</span>
            </div>
            <input
              type="number"
              min={1}
              value={form.slots}
              onChange={e => set('slots', parseInt(e.target.value) || 1)}
              className="w-full text-sm font-bold text-gray-900 bg-transparent outline-none border-b border-gray-200 focus:border-[#2D6A4F] pb-0.5"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onConfirm(form)}
            disabled={posting}
            className="flex-1 bg-[#2D6A4F] hover:bg-[#1b4332] text-white font-extrabold py-3.5 rounded-2xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {posting ? 'Posting…' : 'Post This Gig'}
          </button>
          <button
            onClick={onReset}
            className="px-5 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Redo
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────── */
const RecruitmentChat = () => {
  const { user } = useAuth();
  const [step, setStep] = useState('idle'); // idle | listening | processing | preview | success
  const [transcript, setTranscript] = useState('');
  const [typedText, setTypedText] = useState('');
  const [parsedGig, setParsedGig] = useState(null);
  const [correctedInput, setCorrectedInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [postedGig, setPostedGig] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const latestTextRef = useRef('');
  const handleSendRef = useRef(null);

  const SILENCE_MS = 2500; // auto-stop after 2.5s of silence

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setVoiceSupported(false);
  }, []);

  const cancelCountdown = () => {
    setCountdown(0);
    clearInterval(countdownIntervalRef.current);
  };

  const startCountdown = () => {
    setCountdown(5);
    clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          if (handleSendRef.current) handleSendRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startListening = () => {
    cancelCountdown();
    setError('');
    setTranscript('');
    latestTextRef.current = '';
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    let finalText = '';

    // Auto-stop after SILENCE_MS of no speech
    const resetSilenceTimer = () => {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop(); // triggers onend → sets step to idle
      }, SILENCE_MS);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim = t;
      }
      const val = finalText || interim;
      setTranscript(val);
      latestTextRef.current = val;
      resetSilenceTimer(); // reset every time user speaks
    };

    recognition.onspeechstart = () => resetSilenceTimer();

    recognition.onerror = (e) => {
      clearTimeout(silenceTimerRef.current);
      if (e.error !== 'no-speech') setError(`Mic error: ${e.error}. Try typing instead.`);
      setStep('idle');
    };
    recognition.onend = () => {
      clearTimeout(silenceTimerRef.current);
      setStep(prev => {
        if (prev === 'listening') {
          setTimeout(() => {
            if (latestTextRef.current.trim()) startCountdown();
          }, 0);
          return 'idle';
        }
        return prev;
      });
    };
    recognitionRef.current = recognition;
    recognition.start();
    setStep('listening');
    resetSilenceTimer(); // start timer immediately in case user stays silent
  };

  const stopListening = () => {
    recognitionRef.current?.stop(); // onend handles the countdown
  };

  const handleSend = async () => {
    cancelCountdown();
    const text = transcript || typedText;
    if (!text.trim()) return;
    setError('');
    setStep('processing');
    try {
      const data = await parseGig(user.id, text.trim());
      setParsedGig(data.parsed);
      setCorrectedInput(data.corrected_input || text.trim());
      setStep('preview');
    } catch (e) {
      const msg = e.message || 'Unknown error. Check the backend server.';
      setError(`AI parsing failed: ${msg}`);
      setStep('idle');
    }
  };

  // Keep handleSendRef updated so the interval can call the latest version
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [transcript, typedText, user, step]);

  const handleConfirm = async (formData) => {
    setPosting(true);
    try {
      const result = await postGig({
        merchant_uid: user.id,
        title: formData.title,
        trade: formData.trade,
        description: formData.description,
        district: formData.district,
        area: formData.area,
        budget: formData.budget,
        duration: formData.duration,
        slots: formData.slots || 1,
        tokens_reward: formData.tokens_reward || 1,
      });
      setPostedGig(result.gig);
      setStep('success');
    } catch (e) {
      setError('Failed to post gig: ' + e.message);
    } finally {
      setPosting(false);
    }
  };

  const reset = () => {
    cancelCountdown();
    setStep('idle');
    setTranscript('');
    setTypedText('');
    setParsedGig(null);
    setCorrectedInput('');
    setPostedGig(null);
    setError('');
    latestTextRef.current = '';
    recognitionRef.current?.stop();
  };

  return (
    <div className="min-h-full bg-[#FAFAF7] pb-20">
      <div className="max-w-2xl mx-auto px-6 pt-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#2D6A4F] to-[#52B788] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#1D1C1D]">Recruit with Voice AI</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Speak or type your job requirement. Gemini AI will create the posting for you.
          </p>
        </div>

        {/* SUCCESS */}
        {step === 'success' && postedGig && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1D1C1D] mb-2">Gig Posted!</h2>
            <p className="text-gray-500 font-medium mb-6">
              <strong>{postedGig.title}</strong> is now live. Youth in your area can apply.
            </p>
            <button onClick={reset} className="bg-[#2D6A4F] text-white px-8 py-3 rounded-full font-bold hover:bg-[#1b4332] transition-colors">
              Post Another Gig
            </button>
          </div>
        )}

        {/* PREVIEW */}
        {step === 'preview' && parsedGig && (
          <GigPreview
            gig={parsedGig}
            correctedInput={correctedInput}
            onConfirm={handleConfirm}
            onReset={reset}
            posting={posting}
          />
        )}

        {/* INPUT */}
        {step !== 'success' && step !== 'preview' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-gray-50 to-white px-6 pt-8 pb-6 flex flex-col items-center">

              {/* Mic Button */}
              <div className="relative mb-6">
                {/* Google Colored Pulsing Rings */}
                {step === 'listening' && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-[#4285F4] animate-ping opacity-20" style={{ animationDuration: '1.5s' }}></span>
                    <span className="absolute -inset-2 rounded-full border-2 border-[#EA4335] animate-ping opacity-20" style={{ animationDuration: '2s' }}></span>
                    <span className="absolute -inset-4 rounded-full border-2 border-[#FBBC05] animate-ping opacity-20" style={{ animationDuration: '2.5s' }}></span>
                    <span className="absolute -inset-6 rounded-full border-2 border-[#34A853] animate-ping opacity-20" style={{ animationDuration: '3s' }}></span>
                  </>
                )}
                <button
                  onClick={step === 'listening' ? stopListening : startListening}
                  disabled={!voiceSupported || step === 'processing'}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 relative z-10 ${
                    step === 'listening'
                      ? 'bg-white scale-110 shadow-xl'
                      : 'bg-[#2D6A4F] hover:bg-[#1b4332] hover:scale-105'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {/* Define SVG Gradient for Google Colors */}
                  <svg width="0" height="0">
                    <linearGradient id="googleMicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4285F4" />
                      <stop offset="33%" stopColor="#EA4335" />
                      <stop offset="66%" stopColor="#FBBC05" />
                      <stop offset="100%" stopColor="#34A853" />
                    </linearGradient>
                  </svg>
                  
                  {step === 'processing'
                    ? <Loader2 className="w-10 h-10 text-[#4285F4] animate-spin" />
                    : step === 'listening'
                      ? <MicOff className="w-10 h-10" style={{ stroke: 'url(#googleMicGrad)' }} />
                      : <Mic className="w-10 h-10 text-white" />
                  }
                </button>
              </div>

              <p className={`text-base font-bold mb-4 ${
                step === 'listening' ? 'text-red-500' :
                step === 'processing' ? 'text-[#2D6A4F]' : 'text-gray-500'
              }`}>
                {step === 'listening' ? 'Listening… tap mic to stop'
                  : step === 'processing' ? 'Gemini AI is reading your request…'
                  : voiceSupported ? 'Tap the mic and speak your job requirement'
                  : 'Type your job requirement below'}
              </p>

              {step === 'listening' && <VoiceBars />}

              {transcript && (
                <div className="mt-4 w-full bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">You said:</p>
                  <p className="text-sm text-gray-800 font-medium leading-relaxed">"{transcript}"</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 px-6">
              <div className="flex-1 h-px bg-gray-100"></div>
              <span className="text-xs text-gray-400 font-semibold uppercase">or type</span>
              <div className="flex-1 h-px bg-gray-100"></div>
            </div>

            {/* Text Input */}
            <div className="px-6 py-4">
              <textarea
                ref={textareaRef}
                rows={3}
                placeholder='e.g. "I need a carpenter for 2 days to fix wooden shelves in my shop in Hubli, budget around ₹1200"'
                value={typedText}
                onChange={e => {
                  setTypedText(e.target.value);
                  cancelCountdown();
                  latestTextRef.current = e.target.value;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if ((typedText || transcript).trim()) startCountdown();
                  }
                }}
                className="w-full border border-gray-200 rounded-2xl py-3 px-4 text-sm font-medium text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/40 focus:border-[#2D6A4F] resize-none transition"
              />
            </div>

            {/* Example prompts */}
            {!transcript && !typedText && step === 'idle' && (
              <div className="px-6 pb-4">
                <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Try these examples:</p>
                <div className="space-y-2">
                  {[
                    "I need a weaver for 3 days to help with saree dyeing, ₹600 per day",
                    "Need someone to fix electrical wiring, 1 day job, Dharwad area",
                    "Mujhe ek carpenter chahiye, 2 din ke liye, budget 1500 rupees",
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setTypedText(ex)}
                      className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 transition-colors font-medium"
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-6 mb-4 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium">
                <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Send */}
            <div className="px-6 pb-6 flex gap-3">
              {countdown > 0 ? (
                <>
                  <button
                    disabled
                    className="flex-1 bg-[#2D6A4F] text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 opacity-90 transition-all"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating in {countdown}s...
                  </button>
                  <button
                    onClick={cancelCountdown}
                    className="px-6 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={(!transcript && !typedText) || step === 'processing' || step === 'listening'}
                  className="w-full bg-[#2D6A4F] hover:bg-[#1b4332] text-white py-3.5 rounded-2xl font-extrabold text-sm transition-colors shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {step === 'processing'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with Gemini AI…</>
                    : <><Sparkles className="w-4 h-4" /> Generate Gig Posting</>
                  }
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentChat;
