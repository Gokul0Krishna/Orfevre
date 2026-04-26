import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Search, PlusCircle, CheckCircle, Clock, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getGigs, getMyApplications, applyForGig, getUser } from '../api';
import LiveVerificationModal from '../components/LiveVerificationModal';

const Profile = () => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('gigs');
  const [gigs, setGigs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingGig, setApplyingGig] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofResult, setProofResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    // Fetch user details
    if (user?.id) {
      getUser(user.id).then(setUserData).catch(console.error);
      getMyApplications(user.id).then(data => setApplications(data.applications || [])).catch(console.error);
    }
    
    // Fetch gigs for recommendations
    getGigs().then(data => setGigs(data.gigs || [])).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  // Derived state
  const appliedGigIds = new Set(applications.map(a => a.gig_id));
  const recommendedGigs = gigs.filter(g => g.status === 'open' && !appliedGigIds.has(g.id)).slice(0, 3);
  
  const pendingApps = applications.filter(a => a.status === 'pending');
  const hiredApps = applications.filter(a => a.status === 'accepted');
  const cancelledApps = applications.filter(a => a.status === 'auto_cancelled');

  const handleApplySuccess = async (gig) => {
    if (user?.id) {
      try {
        await applyForGig(gig.id, user.id);
        // Refresh applications
        const data = await getMyApplications(user.id);
        setApplications(data.applications || []);
      } catch (e) {
        alert("Failed to apply. " + e.message);
      }
    }
    setApplyingGig(null);
  };

  const getStatusPill = (status) => {
    if (status === 'accepted') return <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Hired</span>;
    if (status === 'pending') return <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>;
    if (status === 'auto_cancelled') return <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/> Cancelled</span>;
    return <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Open</span>;
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Profile...</div>;

  return (
    <div className="pb-20 max-w-5xl mx-auto px-4 sm:px-6 mt-4">
      
      {/* Verification Modal */}
      {applyingGig && (
        <LiveVerificationModal
          gig={applyingGig}
          onClose={() => setApplyingGig(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* --- Profile Header (Card) --- */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-6">
        
        {/* Top Banner */}
        <div className="h-40 bg-gradient-to-r from-[#4F7942] to-[#809B53] relative overflow-hidden">
          {/* Abstract circles pattern */}
          <div className="absolute top-0 left-0 w-full h-full opacity-30">
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/20"></div>
            <div className="absolute top-10 left-1/3 w-80 h-80 rounded-full bg-white/10"></div>
            <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-black/10"></div>
          </div>
          
          {/* Trust Badge */}
          <div className="absolute top-4 left-4 bg-[#00875a] text-white px-4 py-1.5 rounded-full font-bold shadow flex items-center gap-1">
            <span className="text-yellow-300">⭐</span> Trust: {userData?.trustScore || 85}
          </div>
          
          {/* Top Right Logo Watermark */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-white/80">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            <span className="text-sm font-bold opacity-80">YuvaShakti</span>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="px-6 relative pb-8">
          {/* Avatar (Overlapping) */}
          <div className="absolute -top-12 left-6 w-24 h-24 bg-[#1F2937] rounded-full border-4 border-white flex items-center justify-center text-3xl text-white font-bold shadow-sm z-10">
            {userData?.name ? userData.name.split(' ').map(n=>n[0]).join('') : 'U'}
            {/* Online Status Dot */}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-500 rounded-full border border-white"></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 gap-3">
            <button className="px-5 py-2 rounded-full border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              ✏️ Edit Profile
            </button>
            <button className="px-5 py-2 rounded-full bg-[#1b4332] text-sm font-bold text-white hover:bg-[#153426] flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share
            </button>
          </div>

          {/* Text Info */}
          <div className="mt-4">
            <h1 className="text-2xl font-extrabold text-[#1D1C1D]">{userData?.name || 'User'}</h1>
            <p className="text-sm text-gray-400 font-medium -mt-1 mb-2">राजू कुमार</p> {/* Hardcoded Hindi placeholder for demo */}
            
            <h2 className="text-gray-700 font-semibold">{userData?.trade || 'Hardware & Network Technician'}</h2>
            <p className="text-xs text-gray-400 font-medium mb-3">हार्डवेयर और नेटवर्क तकनीशियन</p> {/* Hardcoded Hindi placeholder */}

            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <MapPin className="w-4 h-4" /> {userData?.district || 'Hubli'}, Karnataka 
              <span className="text-green-600 font-bold ml-2">• Available</span>
            </div>

            <div className="mt-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-700 font-medium leading-relaxed">
                Experienced hardware repair technician with 4+ years in Hubli. Specialise in device repair, networking, and installations.
              </p>
              <p className="text-xs text-gray-400 italic mt-1">4+ साल का अनुभव। डिवाइस मरम्मत, नेटवर्किंग और इंस्टॉलेशन में विशेषज्ञ।</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex bg-gray-50 rounded-2xl p-4 mt-6 border border-gray-100">
            <div className="flex-1 text-center border-r border-gray-200">
              <div className="text-2xl font-extrabold text-[#1D1C1D]">{hiredApps.length || 34}</div>
              <div className="text-xs font-bold text-gray-500 uppercase mt-0.5">Gigs Done</div>
              <div className="text-[10px] text-gray-400">गिग पूरे</div>
            </div>
            <div className="flex-1 text-center border-r border-gray-200">
              <div className="text-2xl font-extrabold text-[#1D1C1D]">{userData?.skillTokens || 7}</div>
              <div className="text-xs font-bold text-gray-500 uppercase mt-0.5">Skill Tokens</div>
              <div className="text-[10px] text-gray-400">कौशल टोकन</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-extrabold text-[#1D1C1D]">128</div>
              <div className="text-xs font-bold text-gray-500 uppercase mt-0.5">Network</div>
              <div className="text-[10px] text-gray-400">नेटवर्क</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Tabs Section --- */}
      <div className="flex bg-gray-50 rounded-full p-1.5 mb-6 shadow-inner border border-gray-200">
        <button onClick={() => setActiveTab('gigs')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all ${activeTab === 'gigs' ? 'bg-[#1a1727] text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50'}`}>
          <span className="font-bold text-sm">Gigs</span>
          <span className="text-[10px] opacity-70">गिग</span>
        </button>
        <button onClick={() => setActiveTab('applied')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all ${activeTab === 'applied' ? 'bg-[#1a1727] text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50'}`}>
          <span className="font-bold text-sm">Applied</span>
          <span className="text-[10px] opacity-70">लागू</span>
        </button>
        <button onClick={() => setActiveTab('tokens')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all ${activeTab === 'tokens' ? 'bg-[#1a1727] text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50'}`}>
          <span className="font-bold text-sm">Tokens</span>
          <span className="text-[10px] opacity-70">टोकन</span>
        </button>
        <button onClick={() => setActiveTab('activity')} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all ${activeTab === 'activity' ? 'bg-[#1a1727] text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50'}`}>
          <span className="font-bold text-sm">Activity</span>
          <span className="text-[10px] opacity-70">गतिविधि</span>
        </button>
      </div>

      {/* --- Tab Content --- */}
      
      {activeTab === 'gigs' && (
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-xl font-extrabold text-[#1D1C1D]">Gig Matches</h2>
              <p className="text-xs text-gray-500 font-medium">गिग मिलान</p>
            </div>
            <button className="bg-[#F4A935] hover:bg-[#d9962f] text-white px-4 py-2 rounded-full font-bold text-sm shadow-sm flex items-center gap-1.5 transition-colors">
              🪄 Find gigs
            </button>
          </div>

          {/* Active / Hired Gigs */}
          {hiredApps.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-[#1D1C1D] text-lg mb-3 px-2">Active Gigs</h3>
              <div className="space-y-4">
                {hiredApps.map(app => (
                  <div key={app.id} className="bg-white rounded-[20px] p-5 shadow-sm border-2 border-[#00875a] flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00875a]"></div>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl border border-green-100">💼</div>
                        <div>
                          <h3 className="font-bold text-[#1D1C1D] text-lg leading-tight">{app.gig?.title || 'Active Gig'}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 font-medium mt-1">
                            <span className="flex items-center gap-1"><span className="text-gray-400">👤</span> {app.gig?.vendorId || 'Vendor'}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> Hired on {new Date(app.updated_at || app.applied_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {getStatusPill(app.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canva Style Cards (Matches) */}
          <div className="space-y-4">
            {recommendedGigs.length === 0 ? (
               <div className="bg-white rounded-2xl p-6 text-center text-gray-500 shadow-sm border border-gray-100">No matches found right now.</div>
            ) : recommendedGigs.map((gig, idx) => (
              <div key={gig.id} className={`bg-white rounded-[20px] p-5 shadow-sm border-2 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md ${idx === 0 ? 'border-[#F4A935]' : 'border-gray-100'}`}>
                {/* Left Colored Accent Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? 'bg-[#F4A935]' : 'bg-transparent'}`}></div>
                
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl border border-blue-100">💻</div>
                    <div>
                      <h3 className="font-bold text-[#1D1C1D] text-lg leading-tight">{gig.title}</h3>
                      <p className="text-xs text-gray-400 mb-2">लैपटॉप स्क्रीन बदलना</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><span className="text-gray-400">👤</span> {gig.vendorId || 'Vendor'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {Math.floor(Math.random() * 5 + 1)}km</span>
                        <span>2h ago</span>
                      </div>
                    </div>
                  </div>
                  {getStatusPill(gig.status || 'open')}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2">
                  <div className="text-xl font-extrabold text-[#00875a]">₹{gig.budget || '800'}</div>
                  <button onClick={() => setApplyingGig(gig)} className="bg-[#F4A935] hover:bg-[#d9962f] text-white font-bold py-2 px-6 rounded-full text-sm shadow-sm transition-colors flex items-center gap-1.5">
                    Accept &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'applied' && (
        <div className="space-y-6">
           <div className="px-2">
              <h2 className="text-xl font-extrabold text-[#1D1C1D]">My Applications</h2>
              <p className="text-xs text-gray-500 font-medium">मेरे आवेदन</p>
            </div>
            {applications.length === 0 ? (
               <div className="bg-white rounded-2xl p-6 text-center text-gray-500 shadow-sm border border-gray-100">No applications yet.</div>
            ) : applications.map((app) => (
              <div key={app.id} className={`bg-white rounded-[20px] p-5 shadow-sm border-2 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md ${app.status === 'accepted' ? 'border-[#00875a]' : 'border-gray-100'}`}>
                {app.status === 'accepted' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00875a]"></div>}
                
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl border border-gray-200">💼</div>
                    <div>
                      <h3 className="font-bold text-[#1D1C1D] text-lg leading-tight">{app.gig?.title || 'Gig Application'}</h3>
                      <p className="text-xs text-gray-400 mb-2">Applied on {new Date(app.applied_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {getStatusPill(app.status)}
                </div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'tokens' && (
         <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
           <div className="text-6xl mb-4">⭐</div>
           <h3 className="text-2xl font-bold text-gray-900">Skill Tokens</h3>
           <p className="text-gray-500 mt-2">You have {userData?.skillTokens || 7} tokens. Complete gigs and verify skills to earn more.</p>
         </div>
      )}

      {activeTab === 'activity' && (
         <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
           {!proofResult ? (
             <>
               <div className="text-6xl mb-4">📷</div>
               <h3 className="text-xl font-bold text-gray-900">Proof of Work Feed</h3>
               <p className="text-gray-500 mt-2">Upload photos of your completed jobs to build your AI-verified portfolio.</p>
               
               <input 
                 type="file" 
                 id="proof-upload" 
                 className="hidden" 
                 accept="image/*"
                 onChange={async (e) => {
                   const file = e.target.files[0];
                   if (!file) return;
                   
                   const desc = prompt("What does this photo show? (e.g. Completed teak wood table)");
                   if (!desc) return;

                   setProofLoading(true);
                   try {
                     const { uploadWorkEvidence } = await import('../api');
                     const result = await uploadWorkEvidence(user?.id || 'guest_1', desc, file);
                     setProofResult(result);
                     
                     if (result.success && user?.id) {
                       getUser(user.id).then(setUserData).catch(console.error);
                     }
                   } catch (err) {
                     console.error(err);
                     setProofResult({ success: false, error: "Error uploading proof. Please try again." });
                   } finally {
                     setProofLoading(false);
                   }
                 }}
               />

               <button 
                 onClick={() => document.getElementById('proof-upload').click()}
                 disabled={proofLoading}
                 className="mt-6 bg-[#007B55] hover:bg-[#006b47] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition-colors disabled:opacity-50"
               >
                 {proofLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <PlusCircle className="w-5 h-5"/>}
                 {proofLoading ? "Analyzing with AI..." : "Add Work Photo"}
               </button>
               
               <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">
                 AI automatically checks tools, trade matching, and GPS location
               </p>
             </>
           ) : (
             <div className="text-left">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-bold text-gray-900">AI Verification Result</h3>
                 <button onClick={() => setProofResult(null)} className="text-gray-400 hover:text-gray-600">
                   <XCircle className="w-6 h-6"/>
                 </button>
               </div>
               
               <div className={`p-6 rounded-xl border-2 ${proofResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                 <div className="flex items-center gap-3 mb-4">
                   {proofResult.success ? (
                     <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                       <CheckCircle className="w-6 h-6"/>
                     </div>
                   ) : (
                     <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                       <XCircle className="w-6 h-6"/>
                     </div>
                   )}
                   <div>
                     <h4 className={`text-lg font-bold ${proofResult.success ? 'text-green-800' : 'text-red-800'}`}>
                       {proofResult.success ? 'Proof Verified Successfully!' : 'Verification Failed'}
                     </h4>
                     <p className={`text-sm ${proofResult.success ? 'text-green-600' : 'text-red-600'}`}>
                       {proofResult.success ? 'Your work has been added to your portfolio.' : (proofResult.error || 'Low AI confidence score.')}
                     </p>
                   </div>
                 </div>

                 <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500 font-medium">AI Match</span>
                     <span className="text-sm font-bold text-gray-900 capitalize">{proofResult.ai_match || 'No'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500 font-medium">Confidence Score</span>
                     <span className="text-sm font-bold text-gray-900">{proofResult.confidence_score || 0}%</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500 font-medium">Geo-Verified</span>
                     <span className="text-sm font-bold text-gray-900">{proofResult.geo_verified ? 'Yes' : 'No'}</span>
                   </div>
                 </div>

                 <button onClick={() => setProofResult(null)} className={`w-full mt-6 py-3 rounded-xl font-bold transition-colors ${proofResult.success ? 'bg-[#007B55] hover:bg-[#006b47] text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                   {proofResult.success ? 'Upload Another' : 'Try Again'}
                 </button>
               </div>
             </div>
           )}
         </div>
      )}

    </div>
  );
};

export default Profile;
