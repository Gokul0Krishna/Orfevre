import React, { useState, useEffect } from 'react';
import { getClusterStats } from '../api';
import { MapPin, Users, Activity, Target, Shield, Zap, RefreshCw, AlertCircle } from 'lucide-react';

const DistrictSummary = () => {
  const [district, setDistrict] = useState('Mysuru');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const districts = ['Mysuru', 'Dharwad', 'Bengaluru', 'Belagavi', 'Kalaburagi', 'Hubli'];

  useEffect(() => {
    fetchStats();
  }, [district]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClusterStats(district);
      setStats(data);
    } catch (e) {
      setError(e.message || 'Failed to fetch district stats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FAFAF7] pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1D1C1D]">District Summary</h1>
            <p className="text-gray-500 mt-2 font-medium">
              Real-time analytics and network density metrics for local districts.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl flex items-center px-4 py-2.5 shadow-sm">
              <MapPin className="w-5 h-5 text-[#007B55] mr-2" />
              <select
                value={district}
                onChange={e => setDistrict(e.target.value)}
                className="bg-transparent text-sm font-bold text-gray-900 outline-none"
              >
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={fetchStats}
              disabled={loading}
              className="bg-white border border-gray-200 p-3 rounded-2xl shadow-sm text-gray-600 hover:text-[#007B55] transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium text-sm">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Youth</h3>
            <div className="text-3xl font-extrabold text-[#1D1C1D]">
              {loading ? '...' : stats?.total_users || 0}
            </div>
            <div className="absolute -right-4 -bottom-4 text-blue-50 opacity-50">
              <Users className="w-32 h-32" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Top Trade Skill</h3>
            <div className="text-2xl font-extrabold text-[#1D1C1D] capitalize">
              {loading ? '...' : stats?.top_trade || 'N/A'}
            </div>
            <div className="absolute -right-4 -bottom-4 text-purple-50 opacity-50">
              <Target className="w-32 h-32" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avg Trust Score</h3>
            <div className="text-3xl font-extrabold text-[#1D1C1D] flex items-end gap-1">
              {loading ? '...' : stats?.avg_trust_score || 0}
              <span className="text-sm text-gray-400 font-semibold mb-1">/ 100</span>
            </div>
            <div className="absolute -right-4 -bottom-4 text-green-50 opacity-50">
              <Shield className="w-32 h-32" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Network Density</h3>
            <div className="text-3xl font-extrabold text-[#1D1C1D]">
              {loading ? '...' : `${(stats?.network_density * 100).toFixed(1)}%`}
            </div>
            <div className="absolute -right-4 -bottom-4 text-orange-50 opacity-50">
              <Activity className="w-32 h-32" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden lg:col-span-2">
            <div className="w-12 h-12 bg-[#007B55]/10 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-[#007B55]" />
            </div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cluster Velocity</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-extrabold text-[#1D1C1D]">
                {loading ? '...' : stats?.velocity_score || 0}
              </div>
              {!loading && stats?.velocity_trend && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  stats.velocity_trend === 'up' ? 'bg-green-100 text-green-700' : 
                  stats.velocity_trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {stats.velocity_trend.toUpperCase()} TREND
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-3 font-medium max-w-sm">
              Indicates the speed of skill acquisition and gig completion within the {district} cluster over the last 30 days.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default DistrictSummary;
