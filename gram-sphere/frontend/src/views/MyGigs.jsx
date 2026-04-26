import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyApplications } from '../api';
import { Loader2, Briefcase, CheckCircle, Clock, XCircle } from 'lucide-react';

const MyGigs = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyApplications(user.id)
      .then(data => {
        setApplications(data.applications || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'accepted':
        return <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-md font-bold text-sm"><CheckCircle className="w-4 h-4" /> Hired!</span>;
      case 'pending':
        return <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1 rounded-md font-bold text-sm"><Clock className="w-4 h-4" /> Pending Review</span>;
      case 'auto_cancelled':
        return <span className="flex items-center gap-1.5 text-gray-500 bg-gray-100 px-3 py-1 rounded-md font-bold text-sm"><XCircle className="w-4 h-4" /> Cancelled</span>;
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#FAFAFA] p-8">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#1D1C1D] mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-[#F4A935]" />
            My Gigs
          </h1>
          <p className="text-gray-500 font-medium">Track the status of your applications.</p>
        </div>

        {applications.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No applications yet</h3>
            <p className="text-gray-500 text-sm">Head over to JobConnect to find and apply for gigs.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white border border-gray-200 p-6 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-xl font-bold text-[#1D1C1D] mb-1">{app.gig?.title || 'Unknown Gig'}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                    <span>Applied on {new Date(app.applied_at).toLocaleDateString()}</span>
                    {app.gig?.tokensReward && (
                      <span className="font-semibold text-gray-700">Reward: {app.gig.tokensReward} Token(s)</span>
                    )}
                  </div>
                </div>
                <div>
                  {getStatusDisplay(app.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGigs;
