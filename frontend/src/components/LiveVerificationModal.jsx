import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, Camera, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

/**
 * LiveVerificationModal
 * 
 * Triggered when a user clicks "Apply" on a gig that requires skill verification.
 * 
 * Flow: intro → camera → recording → processing → result
 * 
 * Backend Integration Required:
 *   POST /api/verify-skill-live
 *   Body: { userId, gigId, requiredSkill, frames: [base64, ...] }
 *   Returns: { verified: true/false, confidence: 0.0-1.0, reason: "..." }
 */

const RECORDING_SECONDS = 10;

const LiveVerificationModal = ({ gig, onClose, onSuccess }) => {
  const [step, setStep] = useState('intro'); // intro | camera | recording | processing | passed | failed
  const [countdown, setCountdown] = useState(RECORDING_SECONDS);
  const [stream, setStream] = useState(null);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const [verificationResult, setVerificationResult] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const countdownRef = useRef(null);
  const frameRef = useRef(null);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, step]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      clearInterval(countdownRef.current);
      clearInterval(frameRef.current);
    };
  }, [stream]);

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setStep('camera');
    } catch (err) {
      alert('Please allow camera access to continue.');
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.6); // compressed
  };

  const startRecording = () => {
    setStep('recording');
    setCountdown(RECORDING_SECONDS);
    const frames = [];

    // Capture a frame every 2 seconds
    frameRef.current = setInterval(() => {
      const frame = captureFrame();
      if (frame) frames.push(frame);
    }, 2000);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          clearInterval(frameRef.current);
          setCapturedFrames(frames);
          stopCamera();
          runVerification(frames);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const runVerification = (frames) => {
    setStep('processing');

    /**
     * BACKEND TODO: Replace this setTimeout mock with a real API call:
     *   POST /api/verify-skill-live
     *   Body: {
     *     userId: CURRENT_USER_ID,
     *     gigId: gig.id,
     *     requiredSkill: gig.title,
     *     frames: frames  (array of base64 JPEG strings)
     *   }
     *   Returns: { verified: true/false, confidence: 0.0-1.0, reason: "..." }
     */
    setTimeout(() => {
      // Mock: 80% pass rate for demo
      const passed = Math.random() > 0.2;
      setVerificationResult({
        verified: passed,
        confidence: passed ? (0.75 + Math.random() * 0.24).toFixed(2) : (0.2 + Math.random() * 0.3).toFixed(2),
        reason: passed
          ? `Live demonstration matches required skill: ${gig.title}.`
          : `Could not clearly identify ${gig.title} activity in the video. Please retry in better lighting.`
      });
      setStep(passed ? 'passed' : 'failed');
      if (passed && onSuccess) onSuccess(gig);
    }, 4000);
  };

  const handleClose = () => {
    stopCamera();
    clearInterval(countdownRef.current);
    clearInterval(frameRef.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00875a]" />
            <span className="font-bold text-gray-900 text-sm">Level 2 Verification</span>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Step: Intro */}
        {step === 'intro' && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-[#00875a]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-[#00875a]" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Prove Your Skill Live</h2>
            <p className="text-sm text-gray-500 font-medium mb-1">You are applying for:</p>
            <p className="text-base font-bold text-[#00875a] mb-6">{gig.title}</p>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">What will happen:</p>
              {[
                { icon: '📷', text: 'Your camera will open' },
                { icon: '⏱️', text: `Record yourself doing the skill for ${RECORDING_SECONDS} seconds` },
                { icon: '🤖', text: 'AI checks if you know the skill' },
                { icon: '✅', text: 'If verified, your application is submitted' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg leading-none">{item.icon}</span>
                  <p className="text-sm font-medium text-gray-700">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-6 text-left">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Make sure you are in a well-lit place and the camera can clearly see your work.</p>
            </div>

            <button
              onClick={startCamera}
              className="w-full bg-[#00875a] hover:bg-[#006b47] text-white font-bold py-4 rounded-2xl shadow-sm transition-colors text-base"
            >
              Open Camera to Start
            </button>
          </div>
        )}

        {/* Step: Camera Ready */}
        {step === 'camera' && (
          <div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-72 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-white text-sm font-bold">📷 Get ready — show your skill clearly</p>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 font-medium mb-4">When you're ready, tap the button below to start the {RECORDING_SECONDS}-second recording.</p>
              <button
                onClick={startRecording}
                className="w-full bg-[#00875a] hover:bg-[#006b47] text-white font-extrabold py-4 rounded-2xl shadow-sm transition-colors text-base"
              >
                🎬 Start Recording ({RECORDING_SECONDS}s)
              </button>
              <button onClick={handleClose} className="mt-3 text-sm text-gray-400 hover:text-gray-600 font-medium w-full py-2">Cancel</button>
            </div>
          </div>
        )}

        {/* Step: Recording */}
        {step === 'recording' && (
          <div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-72 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {/* Recording indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-xs font-bold">REC</span>
              </div>
              {/* Countdown */}
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 text-center">
                <p className="text-white text-3xl font-black">{countdown}</p>
                <p className="text-gray-300 text-xs font-bold">seconds</p>
              </div>
              {/* Guidance */}
              <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-white text-sm font-bold">⚡ Demonstrate your {gig.title} skill now</p>
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-[#00875a] h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((RECORDING_SECONDS - countdown) / RECORDING_SECONDS) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-2">Keep going... AI is watching</p>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-[#00875a]/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <Loader2 className="w-10 h-10 text-[#00875a] animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">AI is Verifying</h2>
            <p className="text-sm text-gray-500 font-medium">Analyzing your live demonstration of</p>
            <p className="text-base font-bold text-[#00875a] mt-1 mb-4">{gig.title}</p>
            <p className="text-xs text-gray-400 font-medium">This usually takes a few seconds...</p>
          </div>
        )}

        {/* Step: Passed */}
        {step === 'passed' && verificationResult && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-11 h-11 text-[#00875a]" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Skill Verified! 🎉</h2>
            <div className="inline-flex items-center gap-1.5 bg-[#00875a] text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              Level 2 Verified
            </div>
            <p className="text-sm text-gray-500 font-medium mb-2">{verificationResult.reason}</p>
            <p className="text-xs text-gray-400 mb-6">AI Confidence: <span className="font-bold text-gray-700">{(verificationResult.confidence * 100).toFixed(0)}%</span></p>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6">
              <p className="text-sm font-bold text-green-800">✅ Your application has been submitted to the employer with a Level 2 Verified badge.</p>
            </div>
            <button onClick={handleClose} className="w-full bg-[#00875a] hover:bg-[#006b47] text-white font-bold py-3.5 rounded-2xl transition-colors">
              Done
            </button>
          </div>
        )}

        {/* Step: Failed */}
        {step === 'failed' && verificationResult && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-11 h-11 text-red-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-sm text-gray-500 font-medium mb-2">{verificationResult.reason}</p>
            <p className="text-xs text-gray-400 mb-6">AI Confidence: <span className="font-bold text-gray-700">{(verificationResult.confidence * 100).toFixed(0)}%</span></p>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
              <p className="text-sm font-bold text-amber-800">💡 Tip: Try again in better lighting, and make sure your work is clearly visible in the frame.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep('intro'); setVerificationResult(null); }} className="flex-1 bg-[#00875a] hover:bg-[#006b47] text-white font-bold py-3.5 rounded-2xl transition-colors">
                Try Again
              </button>
              <button onClick={handleClose} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveVerificationModal;
