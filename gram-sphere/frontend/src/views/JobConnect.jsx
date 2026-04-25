import React, { useState, useEffect } from 'react';
import { Mic, Search, ChevronRight, MapPin, Building, Briefcase, Filter, ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Network } from 'lucide-react';
import { getGigs, getSkillGap } from '../api';
import LiveVerificationModal from '../components/LiveVerificationModal';

// Fallback categories shown when no gigs exist in Firestore
const defaultCategories = [
  { id: 'weaver', title: 'Weaver', openings: 0, icon: '🧵' },
  { id: 'potter', title: 'Potter', openings: 0, icon: '🏺' },
  { id: 'cobbler', title: 'Cobbler', openings: 0, icon: '👟' },
  { id: 'blacksmith', title: 'Blacksmith', openings: 0, icon: '⚒️' },
  { id: 'carpenter', title: 'Carpenter', openings: 0, icon: '🪵' },
  { id: 'farmer', title: 'Farmer', openings: 0, icon: '🌾' },
];

const TRADE_ICONS = {
  Weaver: '🧵', Potter: '🏺', Cobbler: '👟', Blacksmith: '⚒️',
  Carpenter: '🪵', Farmer: '🌾',
};

const JobConnect = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [micState, setMicState] = useState('idle');
  const [categories, setCategories] = useState(defaultCategories);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [applyingGig, setApplyingGig] = useState(null);
  const [appliedGigs, setAppliedGigs] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('All');
  const [tokenFilter, setTokenFilter] = useState('Any');

  // Fetch gigs from the backend on mount
  useEffect(() => {
    setLoading(true);
    getGigs()
      .then((data) => {
        const fetchedGigs = data.gigs || [];
        setGigs(fetchedGigs);

        // Build categories from the fetched gigs
        if (fetchedGigs.length > 0) {
          const tradeCounts = {};
          fetchedGigs.forEach((g) => {
            const trade = g.title || 'Other';
            tradeCounts[trade] = (tradeCounts[trade] || 0) + 1;
          });
          const built = Object.entries(tradeCounts).map(([title, count]) => ({
            id: title.toLowerCase().replace(/\s+/g, '-'),
            title,
            openings: count,
            icon: TRADE_ICONS[title] || '💼',
          }));
          setCategories(built.length > 0 ? built : defaultCategories);
        }
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load gigs:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  // Voice Interaction — calls the Skill Gap AI endpoint
  const handleMicClick = () => {
    if (micState === 'idle') {
      setMicState('listening');
      setTimeout(() => {
        setMicState('processing');
        setAiLoading(true);

        getSkillGap('general', [], 'Mysuru', 'find a job')
          .then((result) => {
            setAiResults(result);
            // Auto-select first recommended gig's category if available
            if (result.recommended_gigs && result.recommended_gigs.length > 0) {
              const matchedTitle = result.recommended_gigs[0].title;
              const match = categories.find(
                (c) => c.title.toLowerCase().includes(matchedTitle.toLowerCase())
              );
              if (match) setSelectedCategory(match);
            }
          })
          .catch((err) => console.error('Skill gap AI failed:', err))
          .finally(() => {
            setAiLoading(false);
            setMicState('idle');
          });
      }, 2000);
    }
  };

  // View 2: Job Listings (Category Selected)
  if (selectedCategory) {
    // Step 1: Filter by category — check title AND trade field
    const categoryGigs = gigs.filter((g) => {
      const title = (g.title || '').toLowerCase();
      const trade = (g.trade || '').toLowerCase();
      const cat = selectedCategory.title.toLowerCase();
      return title.includes(cat) || trade.includes(cat) || cat.includes(title);
    });

    // Step 2: Apply Status filter
    const statusFiltered = statusFilter === 'All'
      ? categoryGigs
      : categoryGigs.filter(g => (g.status || 'open').toLowerCase() === statusFilter.toLowerCase());

    // Step 3: Apply Token Reward filter
    const filteredGigs = tokenFilter === 'Any'
      ? statusFiltered
      : tokenFilter === '1 Token'
        ? statusFiltered.filter(g => (g.tokensReward || 1) === 1)
        : statusFiltered.filter(g => (g.tokensReward || 1) >= 2);

    const clearFilters = () => {
      setStatusFilter('All');
      setTokenFilter('Any');
    };

    return (
      <div className="flex flex-col h-full overflow-y-auto bg-transparent">
        {/* Level 2 Verification Modal */}
        {applyingGig && (
          <LiveVerificationModal
            gig={applyingGig}
            onClose={() => setApplyingGig(null)}
            onSuccess={(gig) => {
              setAppliedGigs(prev => new Set([...prev, gig.id]));
              setApplyingGig(null);
            }}
          />
        )}
        {/* Header Section */}
        <div className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col">
            <button 
              onClick={() => { setSelectedCategory(null); setAiResults(null); }}
              className="text-gray-500 hover:text-blue-600 flex items-center gap-2 mb-4 w-max font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Categories
            </button>
            <h1 className="text-2xl font-extrabold text-[#1D1C1D]">
              {selectedCategory.title} Gigs — {filteredGigs.length} Available
              {(statusFilter !== 'All' || tokenFilter !== 'Any') && (
                <span className="ml-3 text-xs font-bold text-[#007B55] bg-green-50 border border-green-200 px-2.5 py-1 rounded-full align-middle">Filtered</span>
              )}
            </h1>
          </div>
        </div>

        {/* AI Recommendations Banner */}
        {aiResults && aiResults.recommended_gigs && (
          <div className="max-w-7xl mx-auto w-full px-6 pt-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <h3 className="font-bold text-emerald-800 mb-2">AI Recommendations</h3>
              <p className="text-sm text-emerald-700 mb-3">{aiResults.local_demand_context}</p>
              <div className="flex flex-wrap gap-2">
                {aiResults.recommended_gigs.map((rg, i) => (
                  <span key={i} className="bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                    {rg.title} (Match: {rg.matchScore}%)
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 p-6 flex-1">
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-28">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters
                </h3>
                <button 
                  onClick={clearFilters}
                  className="text-sm text-[#00875a] font-medium hover:underline"
                >
                  Clear all
                </button>
              </div>

              {/* Filter Section: Status */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Status</h4>
                <div className="space-y-2.5">
                  {['All', 'open', 'completed'].map(opt => {
                    const label = opt === 'All' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1);
                    const isSelected = statusFilter === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setStatusFilter(opt)}
                        className="flex items-center gap-3 cursor-pointer group w-full text-left"
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#00875a]' : 'border-gray-300 group-hover:border-[#00875a]'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-[#00875a]"></div>}
                        </div>
                        <span className={`text-sm transition-colors ${
                          isSelected ? 'text-[#00875a] font-bold' : 'text-gray-700 font-medium'
                        }`}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Section: Token Reward */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Token Reward</h4>
                <div className="space-y-2.5">
                  {['Any', '1 Token', '2+ Tokens'].map(opt => {
                    const isSelected = tokenFilter === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setTokenFilter(opt)}
                        className="flex items-center gap-3 cursor-pointer group w-full text-left"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#00875a] bg-[#00875a]' : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm transition-colors ${
                          isSelected ? 'text-[#00875a] font-bold' : 'text-gray-700 font-medium'
                        }`}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content: Job Cards */}
          <div className="flex-1 space-y-4">
            {filteredGigs.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-gray-500 font-medium">
                  {categoryGigs.length === 0
                    ? 'No gigs found in this category yet.'
                    : 'No gigs match your current filters.'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {categoryGigs.length === 0
                    ? 'Try seeding data or check back later.'
                    : <button onClick={clearFilters} className="text-[#00875a] font-semibold underline">Clear filters</button>}
                </p>
              </div>
            )}
            {filteredGigs.map(gig => (
              <div key={gig.id} className="bg-white border border-gray-100 rounded-[24px] p-6 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#1D1C1D] group-hover:text-blue-600 transition-colors">{gig.title}</h2>
                    <p className="text-gray-500 font-medium text-sm mt-1">Vendor: {gig.vendorId}</p>
                  </div>
                  {appliedGigs.has(gig.id) ? (
                    <span className="flex items-center gap-1.5 bg-[#007B55] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Applied ✓
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  )}
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span>Reward: {gig.tokensReward || 1} Skill Token(s)</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 justify-between items-center">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${gig.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {gig.status || 'open'}
                  </span>
                  {!appliedGigs.has(gig.id) ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setApplyingGig(gig); }}
                      className="flex items-center gap-1.5 bg-[#007B55] hover:bg-[#006b47] text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Apply (Verify Skill)
                    </button>
                  ) : (
                    <span className="text-xs text-[#007B55] font-bold">Level 2 Verified ✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // View 1: Categories Grid
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-transparent">
      
      {/* Contextual Banner & Header */}
      <div className="px-6 pt-10 pb-4 flex flex-col items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Network className="w-10 h-10 md:w-12 md:h-12 text-[#1E3A8A]" />
          <h1 className="text-4xl md:text-[56px] font-extrabold tracking-tight">
            <span className="text-[#1E3A8A]">JobConnect</span>
            <span className="text-[#007B55]"> Network</span>
          </h1>
        </div>
        <p className="text-gray-500 font-medium mb-8 text-lg text-center">Use your voice or type to discover opportunities near you</p>
        
        <div className="w-full h-32 md:h-48 rounded-[24px] overflow-hidden relative shadow-sm mb-6 border border-gray-200 bg-[#FAFAFA]">
          <img src="/market.jpg" alt="JobConnect Market" className="w-full h-full object-cover mix-blend-multiply opacity-95" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="w-full max-w-2xl mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800 font-medium">
            Backend offline: {error}. Showing default categories.
          </div>
        )}

        <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
          {/* 
          <div className="relative group">
             {micState === 'listening' && (
              <div className="absolute -inset-4 bg-[#00875a]/20 rounded-full animate-ping"></div>
            )}
            {micState === 'processing' && (
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#00875a] via-[#00b075] to-[#00875a] rounded-full animate-spin"></div>
            )}
            <button
              onClick={handleMicClick}
              disabled={aiLoading}
              className={`
                relative flex items-center justify-center w-16 h-16 rounded-full shadow-md transition-all duration-300 z-10 border
                ${micState === 'idle' ? 'bg-white border-gray-200 hover:border-[#00875a] text-gray-700 hover:text-[#00875a]' : ''}
                ${micState === 'listening' ? 'bg-[#00875a] border-transparent text-white scale-110' : ''}
                ${micState === 'processing' ? 'bg-white border-transparent text-[#00875a]' : ''}
              `}
            >
              {aiLoading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Mic className={`w-7 h-7 ${micState === 'listening' ? 'animate-pulse' : ''}`} />
              )}
            </button>
          </div>
          
          <p className={`text-sm font-bold ${micState === 'idle' ? 'text-gray-500' : 'text-[#00875a] animate-pulse'}`}>
            {micState === 'idle' && "Tap to speak your skills"}
            {micState === 'listening' && "Listening..."}
            {micState === 'processing' && "AI is finding matching gigs..."}
          </p> 
          */}

          <div className="w-full relative mt-4">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search gigs by trade or skill..." 
              className="w-full bg-white border border-gray-300 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#00875a] focus:border-transparent shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#00875a] animate-spin" />
          <span className="ml-3 text-gray-500 font-medium">Loading gigs...</span>
        </div>
      )}

      {/* Categories Grid */}
      {!loading && (
        <div className="max-w-7xl mx-auto w-full px-6 py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Explore by Trade</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className="bg-white border border-gray-100 rounded-[16px] p-6 flex items-center justify-between group hover:border-blue-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-sm">
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1D1C1D] group-hover:text-blue-600 transition-colors line-clamp-1 text-lg">{category.title}</h3>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">{category.openings} gig(s)</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobConnect;
