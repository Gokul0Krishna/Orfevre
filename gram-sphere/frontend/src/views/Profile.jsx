import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, ShieldCheck, Image as ImageIcon, Video, Camera, Loader2 } from 'lucide-react';
import { getUser, updateUser, getSkillGap } from '../api';

// Hardcoded user ID for now (would come from auth in production)
const CURRENT_USER_ID = 'user_001';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [skillGapData, setSkillGapData] = useState(null);

  const mockSkills = [
    { name: 'Hardware Repair', level: 'Expert', verified: true },
    { name: 'Network Setup', level: 'Intermediate', verified: true },
    { name: 'Customer Service', level: 'Advanced', verified: false },
  ];

  // Fetch user data from backend on mount
  useEffect(() => {
    setLoading(true);
    getUser(CURRENT_USER_ID)
      .then((data) => {
        setUserData({
          name: data.name || 'Unknown',
          role: data.role || 'youth',
          trade: data.trade || '',
          district: data.district || '',
          location: data.district || '',
          trustScore: data.trustScore || 0,
          skillTokens: data.skillTokens || 0,
        });
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setError(err.message);
        // Fallback to defaults so the UI is still usable
        setUserData({
          name: 'User',
          role: 'youth',
          trade: '',
          district: '',
          location: '',
          trustScore: 0,
          skillTokens: 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch skill gap analysis after profile loads
  useEffect(() => {
    if (userData && userData.trade && userData.district) {
      getSkillGap(userData.trade, [], userData.district, 'improve earnings')
        .then(setSkillGapData)
        .catch((err) => console.error('Skill gap fetch failed:', err));
    }
  }, [userData?.trade, userData?.district]);

  const handleUpload = async () => {
    // In a real app, we would use a file input. 
    // Here we'll simulate picking a file for the sake of the demonstration.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const res = await uploadProof(CURRENT_USER_ID, 'Handloom Weaving', file);
        if (res.success) {
          setShowNewBadge(true);
          // Update local tokens
          setUserData(prev => ({ ...prev, skillTokens: res.totalTokens }));
          alert(res.message);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Verification failed. Is the backend running?');
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser(CURRENT_USER_ID, {
        name: userData.name,
        role: userData.role,
        location: userData.location,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save profile. Is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-[#00875a] animate-spin" />
        <span className="ml-3 text-gray-500 font-medium">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f3f4f6]">
      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-800 font-medium">
          Could not connect to backend: {error}. Showing offline data.
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-32 bg-gradient-to-r from-[#00875a] to-emerald-400"></div>
        <div className="max-w-4xl mx-auto px-6 sm:px-8 pb-8 relative">
          <div className="absolute -top-12 border-4 border-white rounded-full w-24 h-24 bg-gray-200 flex items-center justify-center text-3xl shadow-sm overflow-hidden">
            <span role="img" aria-label="avatar">&#128104;&#8205;&#128295;</span>
          </div>
          <div className="pt-14 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 w-full">
              {isEditing ? (
                <div className="space-y-3 w-full max-w-md">
                  <input
                    name="name"
                    value={userData.name}
                    onChange={handleChange}
                    className="text-2xl font-extrabold text-gray-900 border-b-2 border-[#00875a] bg-transparent focus:outline-none w-full"
                    placeholder="Your Name"
                  />
                  <input
                    name="role"
                    value={userData.role}
                    onChange={handleChange}
                    className="text-gray-600 font-medium border-b border-gray-300 bg-transparent focus:outline-none w-full"
                    placeholder="Your Role"
                  />
                  <input
                    name="location"
                    value={userData.location}
                    onChange={handleChange}
                    className="text-sm text-gray-500 flex items-center gap-1 border-b border-gray-300 bg-transparent focus:outline-none w-full"
                    placeholder="Your Location"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">{userData.name}</h1>
                  <p className="text-gray-600 font-medium">{userData.trade} ({userData.role})</p>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <span role="img" aria-label="pin">&#128205;</span> {userData.location || userData.district}
                  </p>
                </div>
              )}
            </div>

            {/* Trust Score + Skill Tokens Badges */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <span className="bg-emerald-50 text-emerald-700 text-sm font-bold px-3 py-1.5 rounded-lg border border-emerald-200">
                  Trust: {userData.trustScore}
                </span>
                <span className="bg-blue-50 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-lg border border-blue-200">
                  Tokens: {userData.skillTokens}
                </span>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-[#00875a] text-white font-bold px-6 py-2 rounded-full hover:bg-[#006b47] shadow-sm transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="bg-white border border-gray-300 text-gray-700 font-bold px-4 py-2 rounded-full hover:bg-gray-50 shadow-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="bg-white border border-gray-300 text-gray-700 font-bold px-4 py-2 rounded-full hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 sm:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Skills & Badges */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00875a]" />
              Verified Skills
            </h2>
            <p className="text-xs text-gray-500 mb-4 font-medium">
              Skills marked with a blue badge are AI-verified using proof of work.
            </p>
            
            <div className="space-y-3">
              {mockSkills.map((skill) => (
                <div key={skill.name} className="flex flex-col gap-1 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{skill.name}</span>
                    {skill.verified && (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{skill.level}</span>
                </div>
              ))}

              {showNewBadge && (
                <div className="flex flex-col gap-1 pt-3 border-t border-gray-100 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">Mobile Screen Repair</span>
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded w-max border border-green-100">Newly Verified!</span>
                </div>
              )}
            </div>
          </div>

          {/* Skill Gap Recommendations (from AI) */}
          {skillGapData && skillGapData.skill_gaps && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-3">AI Skill Recommendations</h2>
              <p className="text-xs text-gray-500 mb-3 font-medium">
                {skillGapData.local_demand_context}
              </p>
              {skillGapData.top_skill_to_learn && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                  <span className="text-xs font-bold text-emerald-700">Top skill to learn:</span>
                  <p className="text-sm font-semibold text-emerald-800 mt-0.5">{skillGapData.top_skill_to_learn}</p>
                </div>
              )}
              <ul className="space-y-1">
                {skillGapData.skill_gaps.map((gap, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">&#9679;</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Work Proof Gallery */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Upload Proof of Work</h2>
            <p className="text-sm text-gray-500 font-medium mb-6">
              Upload images or videos of your recent work. Our AI will analyze the media and automatically verify your skills.
            </p>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group mb-8" onClick={handleUpload}>
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#00875a] border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-bold text-[#00875a]">AI Analyzing Media...</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-gray-600" />
                  </div>
                  <p className="font-bold text-gray-900">Click to upload photo or video</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">MP4, JPG, PNG up to 50MB</p>
                </>
              )}
            </div>

            {/* Gallery */}
            <h3 className="font-bold text-gray-900 mb-4">Your Work Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="aspect-square bg-gray-100 rounded-xl border border-gray-200 relative group overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                  <span className="text-xs text-white font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-blue-400" /> Verified Network Setup
                  </span>
                </div>
              </div>
              <div className="aspect-square bg-gray-100 rounded-xl border border-gray-200 relative group overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <Video className="w-8 h-8" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                  <span className="text-xs text-white font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-blue-400" /> Verified Motherboard Repair
                  </span>
                </div>
              </div>
              <div className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-xs font-bold">Add New</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
