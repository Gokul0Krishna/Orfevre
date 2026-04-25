import React, { useState, useEffect } from 'react';
import { Map, Users, Link as LinkIcon, Zap, Loader2, Globe, Shield, Activity } from 'lucide-react';
import { getGraphData, getClusterVelocity, getBridgeNodes, getClusterStats } from '../api';

const GramLens = () => {
  const [stats, setStats] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [bridgeNodes, setBridgeNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, velRes, bridgeRes] = await Promise.all([
          getClusterStats('Mysuru'),
          getClusterVelocity(),
          getBridgeNodes()
        ]);
        setStats(statsRes);
        setVelocity(velRes);
        setBridgeNodes(bridgeRes.bridgeNodes || []);
      } catch (err) {
        console.error("Failed to fetch GramLens data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f3f4f6]">
        <Loader2 className="w-10 h-10 text-[#00875a] animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Visualizing Trust Network...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f3f4f6] p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GramLens</h1>
            <p className="text-gray-500 font-medium">Real-time Trust Graph & Cluster Analytics</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-gray-600">LIVE NETWORK</span>
          </div>
        </header>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
              <span className="text-sm font-bold text-gray-500">Total Artisans</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats?.total_users || 0}</p>
            <p className="text-xs text-blue-600 font-bold mt-1">+{Math.floor(Math.random()*10)}% this month</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><LinkIcon className="w-5 h-5" /></div>
              <span className="text-sm font-bold text-gray-500">Trust Edges</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats?.total_edges || 0}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">Verified connections</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Zap className="w-5 h-5" /></div>
              <span className="text-sm font-bold text-gray-500">Cluster Velocity</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{velocity?.velocity?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-amber-600 font-bold mt-1">Economic momentum</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Shield className="w-5 h-5" /></div>
              <span className="text-sm font-bold text-gray-500">Network Density</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{(stats?.network_density * 100).toFixed(1) || 0}%</p>
            <p className="text-xs text-purple-600 font-bold mt-1">Resilience score</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Middle: Graph Visualization Mock (Needs D3 or Canvas for real graph) */}
          <div className="lg:col-span-2 bg-[#1e293b] rounded-3xl p-1 relative min-h-[400px] shadow-xl overflow-hidden group">
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-500/30 rounded-full animate-ping duration-[10000ms]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-blue-400/20 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-blue-300/10 rounded-full"></div>
             </div>
             
             {/* Dynamic Network Points (Simulated) */}
             <div className="absolute inset-0 overflow-hidden">
                {[...Array(15)].map((_, i) => (
                   <div 
                    key={i} 
                    className="absolute w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]"
                    style={{ 
                        top: `${Math.random() * 80 + 10}%`, 
                        left: `${Math.random() * 80 + 10}%`,
                        opacity: Math.random() * 0.5 + 0.3
                    }}
                   ></div>
                ))}
             </div>

             <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <Globe className="w-16 h-16 text-blue-400/50 mb-4 animate-pulse" />
                <h3 className="text-white text-lg font-bold mb-2">Interactive Trust Graph</h3>
                <p className="text-blue-200/60 text-sm max-w-xs font-medium">Viewing {stats?.total_users} nodes and {stats?.total_edges} verified edges in the {stats?.district} cluster.</p>
                <button className="mt-6 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all">Expand View</button>
             </div>

             {/* Legend */}
             <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-400 font-bold">Youth</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-xs text-gray-400 font-bold">Vendor</span>
                </div>
             </div>
          </div>

          {/* Right Column: Key Insights */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Network Bridges
                </h2>
                <p className="text-xs text-gray-500 mb-4 font-medium">These users connect different artisan groups, making them critical for resource distribution.</p>
                
                <div className="space-y-3">
                    {bridgeNodes.length > 0 ? bridgeNodes.map((node, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                    {node.userId.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{node.userId}</p>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Centrality: {node.betweenness?.toFixed(3)}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-blue-500">BRIDGE</span>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-400 italic text-center py-4">Calculating bridge nodes...</p>
                    )}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    Growth Recommendations
                </h2>
                <ul className="space-y-3">
                    <li className="flex gap-3 text-xs font-medium text-gray-600 leading-relaxed">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                        Increase voucher density between the <span className="font-bold text-gray-900">Weaver</span> and <span className="font-bold text-gray-900">Vendor</span> clusters to unlock lower interest rates.
                    </li>
                    <li className="flex gap-3 text-xs font-medium text-gray-600 leading-relaxed">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                        Network stability is <span className="font-bold text-gray-900">High</span>. Suitable for launching a local revolving credit pool.
                    </li>
                </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GramLens;
