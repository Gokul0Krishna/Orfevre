import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Users, Link as LinkIcon, Zap, Shield, Activity, RefreshCw, Info, Store, Hammer, MapPin } from 'lucide-react';
import { getGraphData, getClusterVelocity, getBridgeNodes, getClusterStats } from '../api';

// ── Karnataka district map coordinates (for fallback/reference) ────────
const DISTRICT_POSITIONS = {
  Mysuru:          { x: 0.28, y: 0.72, lat: 12.2958, lng: 76.6394 },
  Mandya:          { x: 0.38, y: 0.62, lat: 12.5218, lng: 76.8951 },
  Hassan:          { x: 0.22, y: 0.50, lat: 13.0033, lng: 76.1004 },
  Kodagu:          { x: 0.18, y: 0.70, lat: 12.4244, lng: 75.7382 },
  Chamarajanagar:  { x: 0.30, y: 0.82, lat: 11.9218, lng: 76.9395 },
  Ramanagara:      { x: 0.48, y: 0.58, lat: 12.7157, lng: 77.2809 },
  Tumkur:          { x: 0.52, y: 0.44, lat: 13.3379, lng: 77.1013 },
  Bengaluru:       { x: 0.62, y: 0.54, lat: 12.9716, lng: 77.5946 },
};

const TRADE_COLORS = {
  carpenter:   '#3b82f6',
  weaver:      '#a855f7',
  potter:      '#f97316',
  blacksmith:  '#64748b',
  tailor:      '#ec4899',
  mason:       '#22c55e',
  default:     '#94a3b8',
};

const ROLE_ICONS = {
  merchant: Store,
  worker: Hammer,
};

const TIER_SIZE = { master: 14, gold: 11, silver: 9, bronze: 7 };

// ── Map Bounds for Projection ──────────────────────────────────────────
const MAP_BOUNDS = {
  minLng: 74.8,  maxLng: 78.5,
  minLat: 11.5,  maxLat: 15.0,
};

// ── D3 Force Graph Component ───────────────────────────────────────────────
const ForceGraph = ({ nodes, edges, onNodeClick, width, height }) => {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  const lngToX = (lng) => ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
  const latToY = (lat) => ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs: glow filter + arrow marker
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'rgba(148,163,184,0.4)');

    const g = svg.append('g');

    // Zoom behaviour
    svg.call(
      d3.zoom()
        .scaleExtent([0.5, 5])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Prepare data
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // Initial positioning
    const simNodes = nodes.map(n => {
      let x, y;
      if (n.role === 'merchant' && n.lat && n.lng) {
        x = lngToX(n.lng);
        y = latToY(n.lat);
      } else {
        // Workers start at their district center if no employment, or average of employers
        const dp = DISTRICT_POSITIONS[n.district] || DISTRICT_POSITIONS.Mysuru;
        x = lngToX(dp.lng) + (Math.random() - 0.5) * 50;
        y = latToY(dp.lat) + (Math.random() - 0.5) * 50;
      }
      return { ...n, x, y };
    });

    const simEdges = edges
      .filter(e => nodeMap[e.fromUserId] && nodeMap[e.toUserId])
      .map(e => ({ source: e.fromUserId, target: e.toUserId, type: e.type, weight: e.weight }));

    simRef.current = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id(d => d.id).distance(50).strength(0.5))
      .force('charge', d3.forceManyBody().strength(d => d.role === 'merchant' ? -100 : -30))
      .force('collision', d3.forceCollide(15))
      // Pin merchants to their GPS locations
      .force('x', d3.forceX(d => d.role === 'merchant' ? lngToX(d.lng) : null).strength(1))
      .force('y', d3.forceY(d => d.role === 'merchant' ? latToY(d.lat) : null).strength(1))
      .alphaDecay(0.02);

    // Draw edges
    const link = g.append('g').selectAll('line')
      .data(simEdges).join('line')
        .attr('stroke', d => d.type === 'employment' ? '#3b82f6' : d.type === 'vouch' ? '#a855f7' : 'rgba(148,163,184,0.2)')
        .attr('stroke-width', d => d.type === 'employment' ? 2 : 1)
        .attr('marker-end', 'url(#arrow)');

    // Draw nodes
    const node = g.append('g').selectAll('g')
      .data(simNodes).join('g')
        .attr('cursor', 'pointer')
        .on('click', (event, d) => { event.stopPropagation(); onNodeClick(d); });

    // Merchant marker (Square/Building style)
    node.filter(d => d.role === 'merchant')
      .append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('x', -9)
      .attr('y', -9)
      .attr('rx', 4)
      .attr('fill', d => TRADE_COLORS[d.trade] || TRADE_COLORS.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', d => d.trustScore > 70 ? 'url(#glow)' : 'none')
      .attr('class', 'transition-all duration-300 hover:scale-125');

    // Worker marker (Circle style)
    node.filter(d => d.role === 'worker')
      .append('circle')
      .attr('r', 7)
      .attr('fill', d => TRADE_COLORS[d.trade] || TRADE_COLORS.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('filter', d => d.trustScore > 85 ? 'url(#glow)' : 'none')
      .attr('class', 'transition-all duration-300 hover:scale-125');

    node.append('title').text(d => `${d.name}\n${d.role.toUpperCase()} · ${d.trade}\nTrust: ${d.trustScore}`);

    // Tick update
    simRef.current.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simRef.current?.stop();
  }, [nodes, edges, width, height]);

  return (
    <svg ref={svgRef} width={width} height={height} className="w-full h-full relative z-10" />
  );
};

// ── Main GramLens View ────────────────────────────────────────────────────
const GramLens = () => {
  const [stats, setStats]           = useState(null);
  const [velocity, setVelocity]     = useState(null);
  const [bridgeNodes, setBridgeNodes] = useState([]);
  const [graphData, setGraphData]   = useState({ nodes: [], edges: [] });
  const [loading, setLoading]       = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeDistrict, setActiveDistrict] = useState('Mysuru');
  const graphRef = useRef(null);
  const [graphSize, setGraphSize]   = useState({ width: 700, height: 450 });

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setGraphSize({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    if (graphRef.current) ro.observe(graphRef.current);
    return () => ro.disconnect();
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, velRes, bridgeRes, graphRes] = await Promise.all([
        getClusterStats(activeDistrict),
        getClusterVelocity(),
        getBridgeNodes(),
        getGraphData(),
      ]);
      setStats(statsRes);
      setVelocity(velRes);
      setBridgeNodes(bridgeRes.bridgeNodes || []);
      setGraphData(graphRes);
    } catch (err) {
      console.error('GramLens fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeDistrict]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const densityPct  = stats ? ((stats.network_density || 0) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-950 text-white font-sans">
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none">GramLens</h1>
              <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Network Geometry & Trust Density</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-xs font-black transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              SYNC NETWORK
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Network Nodes', value: graphData.nodes.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Active Links', value: graphData.edges.length, icon: LinkIcon, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            { label: 'Trust Density', value: `${densityPct}%`, icon: Shield, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            { label: 'Momentum', value: velocity?.score || 0, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-3xl font-black tracking-tighter">{loading ? '...' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Map & Graph Section */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {Object.keys(DISTRICT_POSITIONS).map(d => (
                <button
                  key={d}
                  onClick={() => setActiveDistrict(d)}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-full border whitespace-nowrap transition-all ${
                    activeDistrict === d
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>

            <div
              ref={graphRef}
              className="relative rounded-[40px] overflow-hidden bg-[#0a0f16] border border-slate-800 shadow-2xl h-[550px]"
            >
              {/* Google Maps Styled Layer */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
                {/* Fake Roads/Boundaries */}
                <svg className="w-full h-full">
                  <path d="M0,100 L800,500 M200,0 L600,600 M0,400 L800,200" stroke="#1e293b" strokeWidth="1" fill="none" />
                  {Object.entries(DISTRICT_POSITIONS).map(([name, pos]) => (
                    <circle key={name} cx={`${pos.x * 100}%`} cy={`${pos.y * 100}%`} r="2" fill="#334155" />
                  ))}
                </svg>
              </div>

              {/* District Labels */}
              <div className="absolute inset-0 pointer-events-none">
                {Object.entries(DISTRICT_POSITIONS).map(([name, pos]) => (
                  <div
                    key={name}
                    className="absolute text-[8px] font-black uppercase tracking-[0.2em] text-slate-700"
                    style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%,-50%)' }}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Real D3 Graph Layer */}
              {!loading && graphData.nodes.length > 0 ? (
                <ForceGraph
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onNodeClick={setSelectedNode}
                  width={graphSize.width}
                  height={graphSize.height}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-50">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}

              {/* Overlay: Google Maps Attribution Mock */}
              <div className="absolute bottom-4 right-6 text-[8px] text-slate-600 font-bold flex items-center gap-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/bd/Google_Maps_Logo_2020.svg" className="w-3 opacity-50 grayscale" alt="G" />
                LAYERED VIA GOOGLE MAPS API v3.55
              </div>

              {/* Map Controls Mock */}
              <div className="absolute top-6 right-6 flex flex-col gap-2">
                {['+', '−', '2D'].map(btn => (
                  <button key={btn} className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-xs font-black text-slate-400 hover:text-white transition-colors">
                    {btn}
                  </button>
                ))}
              </div>

              {/* Node Detail HUD */}
              {selectedNode && (
                <div className="absolute bottom-8 left-8 right-8 lg:right-auto lg:w-80 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-xl">
                        {selectedNode.role === 'merchant' ? <Store className="w-4 h-4" /> : <Hammer className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="font-black text-sm uppercase tracking-tight">{selectedNode.name}</h3>
                        <p className="text-[10px] font-bold text-blue-400 uppercase">{selectedNode.role} · {selectedNode.trade}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/50">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Trust Score</p>
                      <p className="text-xl font-black text-emerald-400">{selectedNode.trustScore}</p>
                    </div>
                    <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/50">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Cert Tier</p>
                      <p className="text-xl font-black text-amber-400 capitalize">{selectedNode.certTier}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase">District</p>
                    <p className="text-xs font-bold">{selectedNode.district}, Karnataka</p>
                  </div>
                  {selectedNode.role === 'worker' && (
                    <div className="mt-4 p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl">
                      <p className="text-[9px] font-bold text-blue-400 leading-tight">
                        Worker location hidden for privacy. Current employment link shown on map.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            {/* Legend */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Map Legend</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-600 rounded-md border border-white/20 shadow-[0_0_10px_rgba(37,99,235,0.3)]"></div>
                  <span className="text-xs font-bold text-slate-300">Merchant (Fixed GPS)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-slate-400 rounded-full border border-white/20"></div>
                  <span className="text-xs font-bold text-slate-300">Worker (Employment Link)</span>
                </div>
                <div className="h-px bg-slate-800 my-2"></div>
                <div className="space-y-2">
                  {Object.entries(TRADE_COLORS).filter(([k]) => k !== 'default').map(([trade, color]) => (
                    <div key={trade} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }}></div>
                      <span className="text-[10px] font-black uppercase text-slate-500">{trade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Network Insight */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-500" />
                Network Geometry
              </h2>
              <div className="space-y-3">
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Central Bridge Nodes</p>
                  <div className="space-y-2">
                    {bridgeNodes.slice(0, 3).map((node, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400 truncate w-32">{node.userId}</span>
                        <span className="text-blue-500">+{node.disconnects} Links</span>
                      </div>
                    ))}
                    {!bridgeNodes.length && <p className="text-[10px] text-slate-600 italic">Calculating bridges...</p>}
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <p className="text-[10px] font-bold text-emerald-500 leading-tight">
                    The {activeDistrict} cluster shows 82% resilience. Merchants are well-distributed with high worker retention.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Insights - No Loans */}
            <div className="bg-blue-600/10 border border-blue-600/20 rounded-3xl p-5">
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Geo-Network Insight</h2>
              <div className="space-y-3 text-xs font-bold text-slate-300 leading-relaxed">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                  <p>Increase employment density between <span className="text-white">Weaver</span> and <span className="text-white">Potter</span> hubs.</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                  <p>Worker mobility is high in {activeDistrict}. Recommendation: Incentivize long-term merchant contracts.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default GramLens;
