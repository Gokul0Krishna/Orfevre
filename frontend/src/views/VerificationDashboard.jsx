import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  Award, 
  History, 
  CheckCircle2, 
  XCircle, 
  Info, 
  MapPin, 
  Camera, 
  Video,
  ChevronRight,
  TrendingUp,
  Star
} from 'lucide-react';
import { 
  getTrustScore, 
  getTradeSkills, 
  uploadWorkEvidence, 
  uploadSkillTask, 
  getWorkHistory 
} from '../api';
import { useAuth } from '../context/AuthContext';

const VerificationDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('portfolio');
  const [trustData, setTrustData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Form states
  const [workDesc, setWorkDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [trust, historyRes] = await Promise.all([
        getTrustScore(user.id),
        getWorkHistory(user.id)
      ]);
      setTrustData(trust);
      setHistory(historyRes.verified_work || []);

      // If user is a carpenter, fetch skills
      // In a real app, we'd get the trade from the user profile
      const trade = user.trade || 'carpenter'; 
      const skillsRes = await getTradeSkills(trade);
      setSkills(skillsRes);
    } catch (err) {
      console.error("Error fetching verification data:", err);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleWorkUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !workDesc) return;

    setLoading(true);
    setUploadStatus({ type: 'info', message: 'AI is analyzing your work...' });

    try {
      const result = await uploadWorkEvidence(user.id, workDesc, selectedFile);
      if (result.success) {
        setUploadStatus({ 
          type: 'success', 
          message: `Work verified! AI Confidence: ${result.confidence_score}%` 
        });
        fetchData(); // Refresh history and trust score
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: `Verification failed: ${result.error || result.reason || 'Trade mismatch'}` 
        });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Upload failed. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkillTaskUpload = async (skillId) => {
    if (!selectedFile) {
      alert("Please select a photo or video of the completed task first.");
      return;
    }

    setLoading(true);
    setUploadStatus({ type: 'info', message: 'Woodworking instructor is evaluating...' });

    try {
      const result = await uploadSkillTask(user.id, skillId, selectedFile);
      if (result.success) {
        setUploadStatus({ 
          type: 'success', 
          message: `Congratulations! You earned the "${result.badge_awarded}" badge!` 
        });
        fetchData();
      } else {
        setUploadStatus({ 
          type: 'error', 
          message: `Rejected: ${result.reason}` 
        });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Skill verification failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header & Trust Score */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center space-x-8">
          <div className="relative h-32 w-32 flex-shrink-0">
            <svg className="h-full w-full" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeDasharray="100, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-indigo-600 transition-all duration-1000 ease-out"
                strokeDasharray={`${trustData?.trust_score || 0}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{trustData?.trust_score || 0}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Trust Score</span>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Professional Verification</h1>
            <p className="text-gray-500 leading-relaxed">
              Your Trust Score is calculated using AI portfolio analysis (40%), verified skill badges (30%), and employment history (30%).
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <div className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Level: {user?.cert_tier || 'Beginner'}
              </div>
              <div className="flex items-center text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <Star className="h-4 w-4 mr-1.5" />
                Tokens: {user?.skill_tokens || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 h-32 w-32 text-indigo-500 opacity-20" />
          <h3 className="text-lg font-semibold opacity-90 mb-4">Why verify?</h3>
          <ul className="space-y-3 text-sm font-medium">
            <li className="flex items-start">
              <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5" />
              Unlock High-Value Gigs
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5" />
              Verified MSME Identity
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5" />
              Priority Placement
            </li>
          </ul>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'portfolio', label: 'Upload Work', icon: Upload },
          { id: 'badges', label: 'Skill Quests', icon: Award },
          { id: 'history', label: 'Verification History', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[400px]">
        {activeTab === 'portfolio' && (
          <div className="max-w-2xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Show your craftsmanship</h2>
              <p className="text-gray-500">Upload a photo of your latest work. Our AI will verify the trade and GPS metadata.</p>
            </div>

            <form onSubmit={handleWorkUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Work Description</label>
                <input 
                  type="text" 
                  placeholder="e.g., Hand-carved teak wood chair"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                />
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors relative">
                <input 
                  type="file" 
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <div className="space-y-2">
                  <div className="bg-indigo-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto">
                    <Camera className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedFile ? selectedFile.name : 'Tap to capture or upload photo'}
                  </div>
                  <p className="text-xs text-gray-500">Ensure GPS is enabled on your device for location verification.</p>
                </div>
              </div>

              {uploadStatus && (
                <div className={`p-4 rounded-xl flex items-start space-x-3 ${
                  uploadStatus.type === 'error' ? 'bg-red-50 text-red-700' : 
                  uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium">{uploadStatus.message}</p>
                </div>
              )}

              <button 
                disabled={loading || !selectedFile}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                {loading ? 'Processing...' : 'Submit for AI Verification'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Skill Quests</h2>
              <p className="text-gray-500">Complete these technical tasks to earn permanent badges and boost your trust score.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map(skill => (
                <div key={skill.id} className="group p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all border-l-4 border-l-indigo-600">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                        skill.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                        skill.difficulty === 'intermediate' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {skill.difficulty}
                      </span>
                      <h4 className="font-bold text-gray-900 mt-1">{skill.title}</h4>
                    </div>
                    <Award className="h-5 w-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Requirement: Upload a high-quality video showing you performing this specific joinery/task.
                  </p>
                  
                  <div className="flex space-x-2">
                    <div className="flex-1 relative overflow-hidden bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600">
                      <input 
                        type="file" 
                        accept="video/*,image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                      />
                      {selectedFile ? 'File Ready' : 'Record/Select'}
                    </div>
                    <button 
                      onClick={() => handleSkillTaskUpload(skill.id)}
                      disabled={loading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Your Verified Timeline</h2>
              <p className="text-gray-500">Every piece of work you upload builds your professional reputation.</p>
            </div>

            <div className="space-y-4">
              {history.length > 0 ? history.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="h-16 w-16 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <img src={item.file_url} alt="work" className="h-full w-full object-cover" onError={(e) => e.target.src = "https://via.placeholder.com/64?text=Work"} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-gray-900 text-sm">{item.work_description || 'Woodworking Project'}</h5>
                      <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center text-[10px] font-bold text-indigo-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        AI Verified ({item.ai_overall_score}%)
                      </div>
                      {item.geo_verified && (
                        <div className="flex items-center text-[10px] font-bold text-green-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          Geo-Verified
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              )) : (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">No verified work yet. Start by uploading your first portfolio piece!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationDashboard;
