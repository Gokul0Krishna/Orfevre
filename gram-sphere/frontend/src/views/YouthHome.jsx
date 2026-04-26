import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGigs, getMyApplications, applyForGig } from '../api';
import { Search, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import LiveVerificationModal from '../components/LiveVerificationModal';

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

const GigCard = ({ gig, isApplied, onApply }) => (
  <div className="bg-white border-2 border-transparent hover:border-[#F4A935]/30 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col h-full group relative overflow-hidden">
    <div className="absolute top-4 right-4">
      <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${gig.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
        {gig.status === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>}
        {gig.status || 'open'}
      </span>
    </div>

    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-sm border border-blue-100">
      {TRADE_ICONS[gig.title] || '💼'}
    </div>

    <h3 className="font-bold text-[#1D1C1D] text-lg mb-1 group-hover:text-[#F4A935] transition-colors">{gig.title}</h3>

    <div className="flex items-center gap-3 text-sm text-gray-500 mb-4 mt-auto pt-4">
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Hubli, 2.4km
      </span>
      <span className="text-gray-300">•</span>
      <span>{gig.tokensReward || 1} Token</span>
    </div>

    <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
      <span className="font-extrabold text-lg text-[#007B55]">₹{gig.budget || '800'}</span>
      {isApplied ? (
        <span className="text-[#007B55] font-bold text-sm flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" /> Applied
        </span>
      ) : gig.status === 'open' ? (
        <button
          onClick={() => onApply(gig)}
          className="bg-[#F4A935] hover:bg-[#d9962f] text-white font-bold py-2 px-5 rounded-full text-sm transition-colors shadow-sm"
        >
          Apply →
        </button>
      ) : null}
    </div>
  </div>
);

const YouthHome = () => {
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [appliedGigs, setAppliedGigs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [applyingGig, setApplyingGig] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    setLoading(true);

    if (user?.id) {
      getMyApplications(user.id)
        .then(data => {
          const apps = data.applications || [];
          setAppliedGigs(new Set(apps.map(a => a.gig_id)));
        })
        .catch(console.error);
    }

    getGigs()
      .then((data) => {
        const fetchedGigs = data.gigs || [];
        setGigs(fetchedGigs);

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
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const recommendedGigs = gigs.filter(g => g.status === 'open').slice(0, 3);

  const handleApplySuccess = async (gig) => {
    if (user?.id) {
      try {
        await applyForGig(gig.id, user.id);
        setAppliedGigs(prev => new Set([...prev, gig.id]));
      } catch (e) {
        console.error('Failed to apply:', e);
        alert('Failed to apply. ' + e.message);
      }
    }
    setApplyingGig(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#007B55] animate-spin" />
      </div>
    );
  }

  /* ── Category drill-down view ── */
  if (selectedCategory) {
    const categoryGigs = gigs.filter(g => {
      const title = (g.title || '').toLowerCase();
      const trade = (g.trade || '').toLowerCase();
      const cat = selectedCategory.title.toLowerCase();
      return title.includes(cat) || trade.includes(cat) || cat.includes(title);
    });

    return (
      <div className="pb-12 max-w-6xl mx-auto px-6 pt-8">
        {applyingGig && (
          <LiveVerificationModal
            gig={applyingGig}
            onClose={() => setApplyingGig(null)}
            onSuccess={handleApplySuccess}
          />
        )}

        <button
          onClick={() => setSelectedCategory(null)}
          className="text-gray-500 hover:text-[#007B55] flex items-center gap-2 mb-6 font-medium transition-colors"
        >
          ← Back to Home
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl border border-blue-100 shadow-sm">
            {selectedCategory.icon}
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-[#1D1C1D]">{selectedCategory.title} Gigs</h2>
            <p className="text-gray-500 font-medium">{selectedCategory.openings} open opportunities</p>
          </div>
        </div>

        {categoryGigs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow-sm border border-gray-100">
            No open gigs found for this category right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryGigs.map(gig => (
              <GigCard
                key={gig.id}
                gig={gig}
                isApplied={appliedGigs.has(gig.id)}
                onApply={setApplyingGig}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Default Home view ── */
  return (
    <div className="pb-12">
      {applyingGig && (
        <LiveVerificationModal
          gig={applyingGig}
          onClose={() => setApplyingGig(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* Hero Search Bar */}
      <div className="bg-[#1D1C1D] text-white pt-12 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Find your next gig</h1>
          <p className="text-gray-400 mb-8 text-lg">Opportunities matched to your skills in your district</p>
          <div className="relative max-w-2xl mx-auto">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by skill or trade..."
              className="w-full bg-white/10 border border-white/20 rounded-full py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007B55]"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-10">

        {/* Recommended Gigs */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">Top Matches For You</h2>
          {recommendedGigs.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-500 shadow-sm border border-gray-100">
              No recommendations right now. Check back later!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedGigs.map(gig => (
                <GigCard
                  key={gig.id}
                  gig={gig}
                  isApplied={appliedGigs.has(gig.id)}
                  onApply={setApplyingGig}
                />
              ))}
            </div>
          )}
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">Explore Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className="bg-white border border-gray-100 rounded-[16px] p-5 flex items-center gap-4 hover:border-[#007B55]/50 hover:shadow-md transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl">
                  {category.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[#1D1C1D] text-sm">{category.title}</h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{category.openings} open</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default YouthHome;
