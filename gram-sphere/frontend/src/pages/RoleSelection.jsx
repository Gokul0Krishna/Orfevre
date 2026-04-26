import React, { useState } from 'react';
import { Briefcase, Store, BarChart2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RoleSelection = () => {
  const { user, updateRole, token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleRoleSelect = async (role) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/auth/set-role?user_id=${user.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role })
      });
      
      const data = await res.json();
      if (data.success) {
        updateRole(role, data.token);
      } else {
        setError(data.detail || "Failed to set role");
      }
    } catch (err) {
      console.error("Error setting role:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1D1C1D] tracking-tight mb-4">
            Welcome to YuvaShakti, {user?.name || "User"}!
          </h1>
          <p className="text-xl text-gray-600">
            How would you like to use the platform today?
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Youth / Gig Seeker */}
          <button 
            onClick={() => handleRoleSelect('youth')}
            disabled={isSubmitting}
            className="group flex flex-col items-center p-8 bg-white rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#F4A935] disabled:opacity-50"
          >
            <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="w-10 h-10 text-[#F4A935]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1D1C1D] mb-3">I'm looking for work</h2>
            <p className="text-gray-500 text-center">Find gigs, showcase your skills, and earn trust tokens.</p>
          </button>

          {/* Merchant / Vendor */}
          <button 
            onClick={() => handleRoleSelect('merchant')}
            disabled={isSubmitting}
            className="group flex flex-col items-center p-8 bg-white rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#2D6A4F] disabled:opacity-50"
          >
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Store className="w-10 h-10 text-[#2D6A4F]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1D1C1D] mb-3">I run a shop</h2>
            <p className="text-gray-500 text-center">Hire verified workers, post jobs, and grow your business.</p>
          </button>

          {/* Official */}
          <button 
            onClick={() => handleRoleSelect('official')}
            disabled={isSubmitting}
            className="group flex flex-col items-center p-8 bg-white rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-500 disabled:opacity-50"
          >
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <BarChart2 className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#1D1C1D] mb-3">I'm an official</h2>
            <p className="text-gray-500 text-center">View district economic insights and network clusters.</p>
          </button>
        </div>
        
        {isSubmitting && (
           <div className="mt-8 flex justify-center text-gray-500">
             <Loader2 className="w-6 h-6 animate-spin mr-2" /> Setting up your profile...
           </div>
        )}
      </div>
    </div>
  );
};

export default RoleSelection;
