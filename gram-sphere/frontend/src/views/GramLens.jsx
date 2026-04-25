import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { Users, Link as LinkIcon, Zap, Shield, Activity, RefreshCw, Info } from 'lucide-react';
import { getGraphData, getClusterVelocity, getBridgeNodes, getClusterStats } from '../api';

// ── Karnataka district map coordinates (for geographic positioning) ────────
const DISTRICT_POSITIONS = {
  Mysuru:          { x: 0.28, y: 0.72 },
  Mandya:          { x: 0.38, y: 0.62 },
  Hassan:          { x: 0.22, y: 0.50 },
  Kodagu:          { x: 0.18, y: 0.70 },
  Chamarajanagar:  { x: 0.30, y: 0.82 },
  Ramanagara:      { x: 0.48, y: 0.58 },
  Tumkur:          { x: 0.52, y: 0.44 },
  Bengaluru:       { x: 0.62, y: 0.54 },
};

const TRADE_COLORS = {
  carpenter:   '#3b82f6',
  weaver:      '#a855f7',
  potter:      '#f97316',
  blacksmith:  '#64748b',
  tailor:      '#ec4899',
  mason:       '#22c55e',
  vendor:      '#eab308',
  officer:     '#ef4444',
  default:     '#94a3b8',
};

const TIER_SIZE = { master: 14, gold: 11, silver: 9, bronze: 7 };

// ── Map tile background (OpenStreetMap Karnataka region) ──────────────────
const MAP_BOUNDS = {
  minLng: 74.8,  maxLng: 78.5,
  minLat: 11.5,  maxLat: 15.0,
};

function lngToX(lng, width)  { return ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width; }
function latToY(lat, height) { return ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height; }

// ── Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5" /></div>
      <span className="text-sm font-bold text-gray-500">{label}</span>
    </div>
    <p className="text-3xl font-black text-gray-900">{value}</p>
    {sub && <p className={`text-xs font-bold mt-1 ${color.replace('bg-', 'text-').replace('-50', '-600').replace('text-', 'text-')}`}>{sub}</p>}
  </div>
);

// ── D3 Force Graph Component ───────────────────────────────────────────────
const ForceGraph = ({ nodes, edges, onNodeClick, width, height }) => {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs: glow filter + arrow marker
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'rgba(148,163,184,0.5)');

    const g = svg.append('g');

    // Zoom behaviour
    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Build simulation
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    const simNodes = nodes.map(n => {
      const dp = DISTRICT_POSITIONS[n.district];
      return {
        ...n,
        x: dp ? dp.x * width  + (Math.random() - 0.5) * 60 : width  / 2 + (Math.random() - 0.5) * 200,
        y: dp ? dp.y * height + (Math.random() - 0.5) * 60 : height / 2 + (Math.random() - 0.5) * 200,
      };
    });

    const simEdges = edges
      .filter(e => nodeMap[e.fromUserId] && nodeMap[e.toUserId])
      .map(e => ({ source: e.fromUserId, target: e.toUserId, type: e.type, weight: e.weight }));

    simRef.current = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id(d => d.id).distance(70).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20))
      .alphaDecay(0.03);

    // Draw edges
    const link = g.append('g').selectAll('line')
      .data(simEdges).join('line')
        .attr('stroke', d => d.type === 'vouch' ? '#a855f7' : d.type === 'loan' ? '#f97316' : 'rgba(148,163,184,0.35)')
        .attr('stroke-width', d => Math.max(0.5, (d.weight || 1) * 1.2))
        .attr('marker-end', 'url(#arrow)');

    // Draw nodes
    const node = g.append('g').selectAll('g')
      .data(simNodes).join('g')
        .attr('cursor', 'pointer')
        .call(
          d3.drag()
            .on('start', (event, d) => {
              if (!event.active) simRef.current.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end', (event, d) => {
              if (!event.active) simRef.current.alphaTarget(0);
              d.fx = null; d.fy = null;
            })
        )
        .on('click', (event, d) => { event.stopPropagation(); onNodeClick(d); });

    node.append('circle')
      .attr('r', d => TIER_SIZE[d.certTier] || 7)
      .attr('fill', d => TRADE_COLORS[d.trade] || TRADE_COLORS.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('filter', d => d.certTier === 'master' || d.certTier === 'gold' ? 'url(#glow)' : 'none');

    node.append('title').text(d => `${d.name}\n${d.trade} · ${d.district}\nTrust: ${d.trustScore}`);

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
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full h-full"
    />
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

  const velocityVal = velocity?.score ?? velocity?.velocity ?? 0;
  const densityPct  = stats ? ((stats.network_density || 0) * 100).toFixed(1) : '0.0';

  const tradeColors = Object.entries(TRADE_COLORS).filter(([k]) => k !== 'default');

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto w-full p-6 space-y-5">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">GramLens</h1>
            <p className="text-slate-400 text-sm font-medium">Live Trust Graph · Karnataka Artisan Network</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">LIVE</span>
            </div>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="w-5 h-5 text-blue-400" /></div>
              <span className="text-sm font-bold text-slate-400">Artisans</span>
            </div>
            <p className="text-3xl font-black">{loading ? '—' : (graphData.nodes.length || 0)}</p>
            <p className="text-xs text-blue-400 font-bold mt-1">{activeDistrict} cluster · {stats?.total_users || 0} local</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg"><LinkIcon className="w-5 h-5 text-emerald-400" /></div>
              <span className="text-sm font-bold text-slate-400">Trust Edges</span>
            </div>
            <p className="text-3xl font-black">{loading ? '—' : (stats?.total_edges || graphData.edges.length || 0)}</p>
            <p className="text-xs text-emerald-400 font-bold mt-1">Verified connections</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/20 rounded-lg"><Zap className="w-5 h-5 text-amber-400" /></div>
              <span className="text-sm font-bold text-slate-400">Velocity</span>
            </div>
            <p className="text-3xl font-black">{loading ? '—' : velocityVal}</p>
            <p className="text-xs text-amber-400 font-bold mt-1">
              {velocity?.delta !== undefined ? `${velocity.delta > 0 ? '+' : ''}${velocity.delta}% vs last week` : 'Economic momentum'}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg"><Shield className="w-5 h-5 text-purple-400" /></div>
              <span className="text-sm font-bold text-slate-400">Density</span>
            </div>
            <p className="text-3xl font-black">{loading ? '—' : `${densityPct}%`}</p>
            <p className="text-xs text-purple-400 font-bold mt-1">Network resilience</p>
          </div>
        </div>

        {/* Main graph + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Graph panel */}
          <div className="lg:col-span-2 flex flex-col gap-3">

            {/* District filter pills */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(DISTRICT_POSITIONS).map(d => (
                <button
                  key={d}
                  onClick={() => setActiveDistrict(d)}
                  className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                    activeDistrict === d
                      ? 'bg-blue-500 border-blue-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* The graph canvas — map-style dark background with grid lines */}
            <div
              ref={graphRef}
              className="relative rounded-2xl overflow-hidden bg-[#0f1721] border border-white/10 shadow-xl"
              style={{ minHeight: 420, height: 460 }}
            >
              {/* Map-grid background lines (emulates tile grid) */}
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
                {Array.from({ length: 10 }, (_, i) => (
                  <line key={`h${i}`} x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="#94a3b8" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 14 }, (_, i) => (
                  <line key={`v${i}`} x1={`${i * 7.7}%`} y1="0" x2={`${i * 7.7}%`} y2="100%" stroke="#94a3b8" strokeWidth="0.5" />
                ))}
              </svg>

              {/* District labels on map */}
              <div className="absolute inset-0 pointer-events-none">
                {Object.entries(DISTRICT_POSITIONS).map(([name, pos]) => (
                  <div
                    key={name}
                    className="absolute text-[9px] font-black uppercase tracking-widest text-slate-500"
                    style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%,-50%)' }}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* D3 graph */}
              {!loading && graphData.nodes.length > 0 ? (
                <ForceGraph
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onNodeClick={setSelectedNode}
                  width={graphSize.width}
                  height={graphSize.height}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-bold">Loading network…</p>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-1.5">
                {tradeColors.slice(0, 6).map(([trade, color]) => (
                  <div key={trade} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] text-slate-400 capitalize font-bold">{trade}</span>
                  </div>
                ))}
              </div>

              {/* Edge type legend */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 text-right">
                {[['Gig edge', '#94a3b8'], ['Vouch edge', '#a855f7'], ['Loan edge', '#f97316']].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] text-slate-400 font-bold">{label}</span>
                    <div className="w-5 h-0.5" style={{ background: color }} />
                  </div>
                ))}
              </div>

              {/* Node tooltip */}
              {selectedNode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur border border-white/20 rounded-xl px-4 py-3 shadow-xl z-20 text-sm min-w-[200px]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-white">{selectedNode.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{selectedNode.trade} · {selectedNode.district}</p>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-400 font-bold">TRUST</p>
                      <p className="text-lg font-black text-blue-400">{selectedNode.trustScore}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-400 font-bold">TIER</p>
                      <p className="text-lg font-black text-amber-400 capitalize">{selectedNode.certTier}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-600 font-bold text-center">
              Scroll to zoom · Drag to pan · Click a node for details
            </p>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* Bridge Nodes */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-sm font-black flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-400" />
                Network Bridges
              </h2>
              <p className="text-[10px] text-slate-500 mb-4 font-medium">
                Users whose removal would disconnect the cluster.
              </p>
              <div className="space-y-2">
                {bridgeNodes.length > 0 ? bridgeNodes.map((node, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[10px]">
                        {(node.userId || '?').slice(-2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white truncate max-w-[100px]">{node.userId}</p>
                        <p className="text-[9px] text-blue-400 font-bold">
                          Isolates {node.disconnects || node.wouldIsolate || '?'} group(s)
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">BRIDGE</span>
                  </div>
                )) : (
                  <div className="text-center py-6">
                    <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">
                      {loading ? 'Calculating…' : 'Network fully connected — no critical bridges.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cluster Stats */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-sm font-black flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-emerald-400" />
                {activeDistrict} Cluster
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Artisans', value: stats?.total_users ?? '—' },
                  { label: 'Avg Trust Score', value: stats?.avg_trust_score ?? '—' },
                  { label: 'Top Trade', value: stats?.top_trade ?? '—' },
                  { label: 'Velocity', value: `${velocity?.score ?? 0} new edges/wk` },
                  { label: 'Trend', value: velocity?.trend ? velocity.trend.toUpperCase() : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs text-slate-400 font-bold">{label}</span>
                    <span className="text-xs text-white font-black capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-sm font-black mb-3 text-emerald-400">AI Recommendations</h2>
              <ul className="space-y-3">
                <li className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                  Increase vouch density between <span className="font-bold text-white">Weaver</span> and <span className="font-bold text-white">Vendor</span> clusters.
                </li>
                <li className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                  Network resilience is <span className="font-bold text-white">High</span>. Ready for revolving credit pool.
                </li>
                <li className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                  <span className="font-bold text-white">{stats?.top_trade || 'Carpenter'}</span> cluster has highest growth — prioritize gig listings.
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
