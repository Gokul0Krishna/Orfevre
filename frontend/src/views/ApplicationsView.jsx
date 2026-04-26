import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGigs, getGigApplications, acceptApplication } from '../api';
import {
  Loader2, CheckCircle, Clock, XCircle, ArrowLeft,
  MapPin, Star, ShieldCheck, Briefcase, ChevronRight
} from 'lucide-react';

/* ─── LinkedIn-style Public Profile Modal ─────────────────────────────── */
const ApplicantProfile = ({ app, onClose, onAccept, acceptingId }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">

      {/* Banner */}
      <div className="h-28 bg-gradient-to-r from-[#4F7942] to-[#809B53] relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-3 right-3 bg-[#00875a] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
          Trust: {app.youth_trust_score || 72}
        </div>
      </div>

      {/* Avatar */}
      <div className="px-6 relative">
        <div className="absolute -top-9 w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-extrabold border-4 border-white shadow">
          {app.youth_name?.charAt(0).toUpperCase()}
        </div>

        <div className="pt-14 pb-6">
          <h2 className="text-2xl font-extrabold text-[#1D1C1D]">{app.youth_name}</h2>
          <p className="text-gray-500 font-medium text-sm">Hardware & Network Technician</p>

          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            Hubli, Karnataka
            <span className="text-green-600 font-bold ml-1">• Available</span>
          </div>

          {/* Stats */}
          <div className="flex bg-gray-50 rounded-2xl p-4 mt-5 border border-gray-100 gap-0">
            <div className="flex-1 text-center border-r border-gray-200">
              <div className="text-xl font-extrabold text-[#1D1C1D]">34</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase mt-0.5">Gigs Done</div>
            </div>
            <div className="flex-1 text-center border-r border-gray-200">
              <div className="text-xl font-extrabold text-[#1D1C1D]">7</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase mt-0.5">Tokens</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-xl font-extrabold text-[#1D1C1D]">{app.youth_trust_score || 72}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase mt-0.5">Trust</div>
            </div>
          </div>

          {/* Skills */}
          <div className="mt-5">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" /> Verified Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {['Hardware Repair', 'Network Setup', 'Device Install'].map(s => (
                <span key={s} className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>

          {/* Applied date */}
          <p className="text-xs text-gray-400 mt-5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Applied on {new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Action */}
          <div className="mt-6 flex gap-3">
            {app.status === 'accepted' ? (
              <span className="flex items-center gap-2 text-green-700 font-bold bg-green-50 px-5 py-2.5 rounded-full border border-green-200">
                <CheckCircle className="w-5 h-5" /> Hired
              </span>
            ) : app.status === 'auto_cancelled' ? (
              <span className="text-gray-500 text-sm italic">Auto-cancelled</span>
            ) : (
              <button
                onClick={() => onAccept(app.id)}
                disabled={acceptingId === app.id}
                className="flex-1 bg-[#2D6A4F] hover:bg-[#1b4332] text-white font-bold py-3 rounded-full transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {acceptingId === app.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Accept Worker
              </button>
            )}
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-bold py-3 rounded-full hover:bg-gray-50 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Main Applications View ──────────────────────────────────────────── */
const ApplicationsView = () => {
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [selectedGig, setSelectedGig] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [viewingApplicant, setViewingApplicant] = useState(null);

  useEffect(() => {
    setLoading(true);
    getGigs()
      .then(data => {
        const myGigs = (data.gigs || []).filter(
          g => g.merchant_uid === user.id || g.vendorId === user.name
        );
        setGigs(myGigs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id, user.name]);

  const handleGigSelect = (gig) => {
    setSelectedGig(gig);
    setAppsLoading(true);
    getGigApplications(gig.id)
      .then(data => setApplications(data.applications || []))
      .catch(console.error)
      .finally(() => setAppsLoading(false));
  };

  const handleAccept = async (appId) => {
    setAcceptingId(appId);
    try {
      await acceptApplication(selectedGig.id, appId, user.id);
      handleGigSelect(selectedGig);
      setViewingApplicant(prev => prev ? { ...prev, status: 'accepted' } : null);
    } catch (e) {
      alert('Failed to accept: ' + e.message);
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#FAFAF7] pb-16">

      {/* Applicant Profile Modal */}
      {viewingApplicant && (
        <ApplicantProfile
          app={viewingApplicant}
          onClose={() => setViewingApplicant(null)}
          onAccept={handleAccept}
          acceptingId={acceptingId}
        />
      )}

      {/* ── Header ── */}
      <div className="max-w-4xl mx-auto px-6 pt-10 text-center">
        <h1 className="text-3xl font-extrabold text-[#1D1C1D]">My Gig Postings</h1>
        <p className="text-gray-500 mt-1 font-medium">
          {selectedGig
            ? `Showing applicants for "${selectedGig.title}"`
            : 'Select a gig to view applicants'}
        </p>
      </div>

      {/* ── Gig Pills (Horizontal scroll) ── */}
      <div className="max-w-4xl mx-auto px-6 mt-6">
        {gigs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 text-gray-500">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No gigs posted yet.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {gigs.map(gig => (
              <button
                key={gig.id}
                onClick={() => handleGigSelect(gig)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full font-bold text-sm border transition-all ${
                  selectedGig?.id === gig.id
                    ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#2D6A4F] hover:text-[#2D6A4F]'
                }`}
              >
                {gig.title}
                {selectedGig?.id === gig.id && <span className="ml-2 text-xs opacity-80">({applications.length})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Applicants ── */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        {!selectedGig ? null : appsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-400 font-medium">No applicants yet for this gig.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <div
                key={app.id}
                className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
              >
                {/* Left: Avatar + Info */}
                <button
                  className="flex items-center gap-4 text-left flex-1"
                  onClick={() => setViewingApplicant(app)}
                >
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                    {app.youth_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#1D1C1D] flex items-center gap-2">
                      {app.youth_name}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
                        ⭐ Trust: {app.youth_trust_score || 72}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Right: Action */}
                <div className="flex-shrink-0 ml-4">
                  {app.status === 'accepted' ? (
                    <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-4 py-2 rounded-full font-bold text-sm border border-green-200">
                      <CheckCircle className="w-4 h-4" /> Hired
                    </span>
                  ) : app.status === 'auto_cancelled' ? (
                    <span className="flex items-center gap-1.5 text-gray-400 bg-gray-50 px-4 py-2 rounded-full font-bold text-sm border border-gray-200">
                      <XCircle className="w-4 h-4" /> Cancelled
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAccept(app.id)}
                      disabled={acceptingId === app.id}
                      className="bg-[#2D6A4F] hover:bg-[#1b4332] text-white px-5 py-2 rounded-full font-bold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {acceptingId === app.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      Accept
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsView;
