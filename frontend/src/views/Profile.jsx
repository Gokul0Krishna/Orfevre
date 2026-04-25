import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, CheckCircle, ShieldCheck, Camera, 
  MapPin, X, ThumbsUp, MessageSquare, Share2, MoreHorizontal 
} from 'lucide-react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    name: 'Raju Kumar',
    role: 'Hardware & Network Technician',
    location: 'Hubli, Karnataka'
  });
  
  // Camera & Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  
  // Feed States
  const [posts, setPosts] = useState([
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      location: { lat: '15.3647', lng: '75.1239', address: 'Vidya Nagar, Hubli' },
      timestamp: '2 hours ago',
      tags: ['#PCRepair', '#Hardware', '#Diagnostics'],
      verified: true
    }
  ]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const mockSkills = [
    { name: 'Hardware Repair', level: 'Expert', verified: true },
    { name: 'Network Setup', level: 'Intermediate', verified: true },
    { name: 'Customer Service', level: 'Advanced', verified: false },
  ];

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraOpen]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Please allow camera access to use this feature.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Capture Photo
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg');
    stopCamera();
    setIsUploading(true);

    // Get Geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => processPost(photoData, position.coords),
        (error) => {
          console.warn("Geolocation denied or error:", error);
          processPost(photoData, null); // proceed without exact location
        }
      );
    } else {
      processPost(photoData, null);
    }
  };

  const processPost = (photoData, coords) => {
    // Mock processing delay for Gemini Vision API
    setTimeout(() => {
      setIsUploading(false);
      
      const newPost = {
        id: Date.now(),
        image: photoData,
        location: coords 
          ? { lat: coords.latitude.toFixed(4), lng: coords.longitude.toFixed(4), address: 'Captured Location' }
          : { lat: 'Unknown', lng: 'Unknown', address: 'Location disabled' },
        timestamp: 'Just now',
        tags: ['#MotherboardRepair', '#Hardware', '#VerifiedSkill'],
        verified: true
      };
      
      setPosts([newPost, ...posts]);
    }, 3000);
  };

  const handleSave = () => {
    setIsEditing(false);
    console.log('Sending data to backend:', userData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f3f4f6]">
      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="h-32 bg-gradient-to-r from-[#00875a] to-emerald-400"></div>
        <div className="max-w-4xl mx-auto px-6 sm:px-8 pb-8 relative">
          <div className="absolute -top-12 border-4 border-white rounded-full w-24 h-24 bg-gray-200 flex items-center justify-center text-3xl shadow-sm overflow-hidden z-10">
            👨‍🔧
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
                  <p className="text-gray-600 font-medium">{userData.role}</p>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    📍 {userData.location}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSave}
                    className="bg-[#00875a] text-white font-bold px-6 py-2 rounded-full hover:bg-[#006b47] shadow-sm transition-colors"
                  >
                    Save Changes
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

      <div className="max-w-4xl mx-auto w-full px-6 sm:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Skills & Badges */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm sticky top-6">
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
            </div>
          </div>
        </div>

        {/* Right Column: Work Proof Feed */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Create Post / Camera Area */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">👨‍🔧</div>
              <button 
                onClick={startCamera}
                className="flex-1 text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-gray-500 font-medium transition-colors"
              >
                Upload proof of work...
              </button>
            </div>
            
            {isUploading && (
              <div className="p-8 flex flex-col items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-[#00875a] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="font-bold text-[#00875a]">AI Analyzing Media & Location...</p>
              </div>
            )}

            {isCameraOpen && !isUploading && (
              <div className="relative bg-black">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-[400px] object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Camera Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                  <button 
                    onClick={stopCamera}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleCapture}
                    className="w-16 h-16 border-4 border-white rounded-full flex items-center justify-center group"
                  >
                    <div className="w-12 h-12 bg-white rounded-full group-hover:scale-90 transition-transform"></div>
                  </button>
                  <div className="w-10 h-10"></div> {/* Spacer to center the capture button */}
                </div>
              </div>
            )}
          </div>

          {/* LinkedIn Style Feed */}
          <div className="space-y-6">
            {posts.map(post => (
              <div key={post.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Post Header */}
                <div className="p-4 flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">👨‍🔧</div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">{userData.name}</h3>
                      <p className="text-xs text-gray-500">{userData.role}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{post.timestamp}</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3">
                  <p className="text-sm text-gray-700 mb-3">
                    Just completed another task! Proof of work captured and verified.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-[#00875a] text-sm font-semibold hover:underline cursor-pointer">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Media & Metadata Overlay */}
                <div className="relative">
                  <img src={post.image} alt="Proof of work" className="w-full aspect-video object-cover bg-gray-100" />
                  
                  {/* Verification Badge */}
                  {post.verified && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 border border-gray-200">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-gray-900">AI Verified</span>
                    </div>
                  )}

                  {/* Geolocation Tag */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-medium text-white shadow-sm">
                      {post.location.address} ({post.location.lat}, {post.location.lng})
                    </span>
                  </div>
                </div>

                {/* Social Actions */}
                <div className="px-4 py-3 border-t border-gray-100 flex justify-between">
                  <button className="flex items-center gap-2 text-gray-500 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium text-sm transition-colors flex-1 justify-center">
                    <ThumbsUp className="w-5 h-5" /> Like
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium text-sm transition-colors flex-1 justify-center">
                    <MessageSquare className="w-5 h-5" /> Comment
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium text-sm transition-colors flex-1 justify-center">
                    <Share2 className="w-5 h-5" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
