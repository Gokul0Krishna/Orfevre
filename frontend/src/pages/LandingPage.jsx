import React, { useState, useEffect, useRef } from 'react';
import { Smartphone } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import ChatbotWidget from '../components/ChatbotWidget';

const LandingPage = () => {
  const { login: authLogin } = useAuth();
  const [scrollState, setScrollState] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const scrollContainerRef = useRef(null);

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setIsLoggingIn(true);
      setAuthError(null);
      try {
        // Try to verify with backend first
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: codeResponse.access_token })
        });
        const data = await res.json();
        if (data.success) {
          // Backend verified: use backend JWT
          authLogin(data.token, data.user);
        } else {
          // Backend returned error: fallback to Google token directly
          console.warn("Backend auth failed, using Google token as fallback:", data);
          authLogin(codeResponse.access_token);
        }
      } catch (err) {
        // Backend unreachable (not running): fallback to Google token directly
        console.warn("Backend unreachable, using Google token as fallback:", err);
        authLogin(codeResponse.access_token);
      } finally {
        setIsLoggingIn(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Failed:', error);
      setAuthError('Google sign-in failed. Please try again.');
      setIsLoggingIn(false);
    }
  });

  useEffect(() => {
    setIsVisible(true);
    
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const containerTop = rect.top;
      const containerHeight = rect.height;
      
      const windowHeight = window.innerHeight;
      const scrollProgress = -containerTop / (containerHeight - windowHeight);
      
      if (scrollProgress < 0) setScrollState(0);
      else if (scrollProgress >= 1) setScrollState(3);
      else {
        const stateIndex = Math.floor(scrollProgress * 4);
        setScrollState(Math.min(stateIndex, 3));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToAbout = (e) => {
    e.preventDefault();
    scrollContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF0F5] to-[#FDF5E6] text-[#1D1C1D] font-sans w-full overflow-x-hidden relative">
      
      {/* Floating Pill Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 mt-4 flex justify-center">
        <header className="w-full max-w-[1280px] bg-transparent px-6 md:px-8 py-3 flex items-center justify-between">
          
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              {/* GramSphere Logo (using a geometric vector icon) */}
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span className="text-white font-bold text-[24px] tracking-tight">YuvaShakti</span>
          </div>

          {/* Right: Navigation & Actions */}
          <div className="flex items-center gap-6">
            <nav className="hidden md:block">
              <a href="#about" onClick={scrollToAbout} className="text-gray-200 font-medium text-[16px] hover:text-white transition-colors">
                About
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => login()}
                className="hidden sm:block bg-transparent border border-white/50 text-white px-5 py-2 rounded uppercase font-bold text-[14px] hover:bg-white/10 transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => login()}
                className="bg-white text-gray-900 px-5 py-2 rounded uppercase font-bold text-[14px] hover:bg-gray-100 transition-colors shadow-sm"
              >
                Sign Up
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Full Bleed Hero Section */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-24 px-4 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img src="/market.jpg" alt="Local market background" className="w-full h-full object-cover blur-[4px] scale-105 grayscale" />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-[1280px] mx-auto mt-12">
          <h1 className="text-[64px] md:text-[96px] font-bold text-white text-center leading-tight mb-16 tracking-tight pb-2">
            YuvaShakti
          </h1>
          <p className="text-2xl md:text-[28px] text-gray-200 text-center mb-6 max-w-4xl font-medium leading-relaxed">
            Empowering local economies. Connect, showcase your skills, and grow your community.
          </p>
          <p className="text-lg md:text-xl text-gray-300 font-medium mb-16 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            Powered by Google Gemini — built for Bharat.
          </p>

          <button
            onClick={() => login()}
            disabled={isLoggingIn}
            className="bg-[#007B55] hover:bg-[#006b47] disabled:bg-[#007B55]/60 disabled:cursor-wait text-white px-10 py-4 rounded-full font-bold transition-colors shadow-lg shadow-[#007B55]/40 text-[18px] flex items-center gap-3"
          >
            {isLoggingIn ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </>
            ) : (
              <>Get Started Free</>
            )}
          </button>
          {authError && (
            <p className="mt-4 text-red-400 text-sm font-medium bg-red-500/10 border border-red-400/30 px-4 py-2 rounded-lg">{authError}</p>
          )}
        </div>
      </section>

      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 pt-16">
        <main className="flex flex-col gap-12 pb-24">
          
          {/* Scroll Section - 4 States */}
          <section id="about" className="relative w-full" style={{ height: '300vh' }} ref={scrollContainerRef}>
            <div className="sticky top-[96px] h-[calc(100vh-120px)] min-h-[600px] flex items-center">
              <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 p-8 w-full h-full max-h-[700px] flex flex-col md:flex-row relative overflow-hidden">
                
                {/* Progress Indicator Line */}
                <div className="absolute left-8 top-12 bottom-12 w-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="absolute top-0 w-full bg-[#007B55] transition-all duration-500 ease-out" style={{ height: '25%', opacity: scrollState >= 0 ? 1 : 0 }}></div>
                  <div className="absolute top-[25%] w-full bg-[#007B55] transition-all duration-500 ease-out" style={{ height: '25%', opacity: scrollState >= 1 ? 1 : 0 }}></div>
                  <div className="absolute top-[50%] w-full bg-[#F4A935] transition-all duration-500 ease-out" style={{ height: '25%', opacity: scrollState >= 2 ? 1 : 0 }}></div>
                  <div className="absolute top-[75%] w-full bg-[#F4A935] transition-all duration-500 ease-out" style={{ height: '25%', opacity: scrollState >= 3 ? 1 : 0 }}></div>
                </div>

                {/* Left Content Area (Text) */}
                <div className="pl-12 md:pl-16 w-full md:w-5/12 flex flex-col justify-center relative z-10 h-full">
                  {/* State 1 Text */}
                  <div className={`absolute transition-opacity duration-350 ease-in-out w-[90%] ${scrollState === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold tracking-wider mb-6 border border-orange-200 uppercase">
                      FOR JOB SEEKERS
                    </div>
                    <h3 className="text-[32px] md:text-[40px] font-semibold text-[#1D1C1D] leading-tight mb-4">Find local gigs by your trade.</h3>
                    <p className="text-[16px] text-[#454245] mb-8 leading-relaxed">
                      Browse real openings near you by skill — weaving, carpentry, farming and more. Apply and verify your skill on the spot with your camera.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-[#F4F4F4] border border-[#CCCCCC]/50 px-4 py-2 rounded-lg text-sm font-semibold text-[#1D1C1D]">
                      🤝 Camera-verified skill matching
                    </div>
                  </div>

                  {/* State 2 Text */}
                  <div className={`absolute transition-opacity duration-350 ease-in-out w-[90%] ${scrollState === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold tracking-wider mb-6 border border-green-200 uppercase">
                      TRUST & REPUTATION
                    </div>
                    <h3 className="text-[32px] md:text-[40px] font-semibold text-[#1D1C1D] leading-tight mb-4">Your skills, verified by AI.</h3>
                    <p className="text-[16px] text-[#454245] mb-8 leading-relaxed">
                      Post your work. Gemini analyzes it, verifies your skills, and builds your Trust Score — so employers know you're the real deal.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-[#F4F4F4] border border-[#CCCCCC]/50 px-4 py-2 rounded-lg text-sm font-semibold text-[#1D1C1D]">
                      🛡️ AI Verified skill badges
                    </div>
                  </div>

                  {/* State 3 Text */}
                  <div className={`absolute transition-opacity duration-350 ease-in-out w-[90%] ${scrollState === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold tracking-wider mb-6 border border-amber-200 uppercase" style={{ color: '#F4A935' }}>
                      FOR VENDORS
                    </div>
                    <h3 className="text-[32px] md:text-[40px] font-semibold text-[#1D1C1D] leading-tight mb-4">Show your product. Reach more customers.</h3>
                    <p className="text-[16px] text-[#454245] mb-8 leading-relaxed">
                      Upload a photo, speak about what you sell. Gemini creates your listing and a shareable WhatsApp card — instantly.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-[#F4F4F4] border border-[#CCCCCC]/50 px-4 py-2 rounded-lg text-sm font-semibold text-[#1D1C1D]">
                      📦 Listed in under 30 seconds
                    </div>
                  </div>

                  {/* State 4 Text */}
                  <div className={`absolute transition-opacity duration-350 ease-in-out w-[90%] ${scrollState === 3 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="inline-block px-3 py-1 rounded-full text-white text-[10px] font-bold tracking-wider mb-6 border border-gray-700 uppercase" style={{ backgroundColor: '#1A1A2E' }}>
                      FOR OFFICIALS
                    </div>
                    <h3 className="text-[32px] md:text-[40px] font-semibold text-[#1D1C1D] leading-tight mb-4">See your district come alive.</h3>
                    <p className="text-[16px] text-[#454245] mb-8 leading-relaxed">
                      A live map of economic activity across clusters. Know exactly where support is needed before it's too late.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-[#F4F4F4] border border-[#CCCCCC]/50 px-4 py-2 rounded-lg text-sm font-semibold text-[#1D1C1D]">
                      🗺️ Real-time cluster intelligence
                    </div>
                  </div>
                </div>

                {/* Right Content Area (Visuals) */}
                <div className="w-full md:w-7/12 h-full relative overflow-hidden flex items-center justify-center p-4">
                  
                  {/* Visual 1: JobConnect */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-[350ms] ease-in-out origin-center ${
                    scrollState === 0 ? 'translate-x-0 opacity-100' : scrollState > 0 ? '-translate-x-[120%] opacity-0' : 'translate-x-[120%] opacity-0'
                  }`}>
                    <div className="w-[85%] bg-white rounded-[16px] shadow-[0_10px_30px_rgba(0,123,85,0.15)] border border-gray-200 overflow-hidden transform rotate-2 flex flex-col h-max max-h-[90%]">
                      <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <div className="mx-auto bg-white border border-gray-200 rounded text-[10px] px-8 text-gray-400 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> orfevre.app/jobconnect
                        </div>
                      </div>
                      <img src="/jobconnect_catory_jobs.png" alt="JobConnect Interface" className="w-full object-cover" />
                    </div>
                  </div>

                  {/* Visual 2: Profile */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-[350ms] ease-in-out ${
                    scrollState === 1 ? 'translate-x-0 opacity-100' : scrollState > 1 ? '-translate-x-[120%] opacity-0' : 'translate-x-[120%] opacity-0'
                  }`}>
                    <div className="w-[85%] bg-white rounded-[16px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden flex flex-col h-max max-h-[90%]">
                      <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <div className="mx-auto bg-white border border-gray-200 rounded text-[10px] px-8 text-gray-400 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> orfevre.app/profile
                        </div>
                      </div>
                      <img src="/profile_img.png" alt="Profile Interface" className="w-full object-cover" />
                    </div>
                  </div>

                  {/* Visual 3: BazaarPulse Placeholder */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-[350ms] ease-in-out ${
                    scrollState === 2 ? 'translate-x-0 opacity-100' : scrollState > 2 ? '-translate-x-[120%] opacity-0' : 'translate-x-[120%] opacity-0'
                  }`}>
                    <div className="w-[85%] aspect-[4/3] bg-gray-50 rounded-[16px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden flex flex-col relative">
                      <div className="h-8 bg-gray-200 border-b border-gray-300 flex items-center px-4 gap-2 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-center relative">
                        <p className="text-xl font-bold text-gray-400">BazaarPulse — Coming Soon</p>
                        <div className="absolute top-4 right-4 bg-[#F4A935] text-amber-900 text-[11px] font-bold px-3 py-1 rounded shadow-sm border border-[#d6932e]">
                          In Development
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual 4: GramLens Placeholder */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-[350ms] ease-in-out ${
                    scrollState === 3 ? 'translate-x-0 opacity-100' : scrollState > 3 ? '-translate-x-[120%] opacity-0' : 'translate-x-[120%] opacity-0'
                  }`}>
                    <div className="w-[85%] aspect-[4/3] bg-gray-50 rounded-[16px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden flex flex-col relative">
                      <div className="h-8 bg-gray-200 border-b border-gray-300 flex items-center px-4 gap-2 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      </div>
                      <div className="flex-1 flex items-center justify-center relative">
                        <p className="text-xl font-bold text-gray-400">GramLens — Coming Soon</p>
                        <div className="absolute top-4 right-4 bg-[#F4A935] text-amber-900 text-[11px] font-bold px-3 py-1 rounded shadow-sm border border-[#d6932e]">
                          In Development
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-200 pt-16 pb-8 px-4 md:px-8 mt-auto relative z-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            
            {/* Branding Column */}
            <div className="col-span-1 sm:col-span-2 md:col-span-1 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="text-[#1D1C1D] font-bold text-xl tracking-tight">YuvaShakti</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Empowering local economies. Connect, showcase your skills, and grow your community in your own language.
              </p>
            </div>
            
            {/* Product Links */}
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[#1D1C1D]">Product</h4>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">JobConnect</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Profile Verification</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors inline-flex items-center">
                BazaarPulse 
                <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded ml-2">Soon</span>
              </a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors inline-flex items-center">
                GramLens 
                <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded ml-2">Soon</span>
              </a>
            </div>

            {/* Company Links */}
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[#1D1C1D]">Company</h4>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">About Us</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Careers</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Press & Media</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Contact Support</a>
            </div>

            {/* Legal Links */}
            <div className="flex flex-col gap-4">
              <h4 className="font-bold text-[#1D1C1D]">Legal</h4>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Cookie Policy</a>
              <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">Trust & Safety</a>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">© {new Date().getFullYear()} YuvaShakti Network. All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Powered by Google Gemini
            </div>
          </div>
        </div>
      </footer>

      {/* Navigation Chatbot Assistant */}
      <ChatbotWidget />
    </div>
  );
};

export default LandingPage;
