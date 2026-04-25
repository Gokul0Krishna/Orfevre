import React, { useState } from 'react';
import { Mic, Search, ChevronRight, MapPin, Building, Briefcase, Filter, ArrowLeft, CheckCircle2 } from 'lucide-react';

// Mock Data
const categories = [
  { id: 'hardware', title: 'Hardware Network Engineer', openings: 106, icon: '🖥️' },
  { id: 'accountant', title: 'Accountant', openings: 4577, icon: '📊' },
  { id: 'delivery', title: 'Delivery', openings: 4344, icon: '🚚' },
  { id: 'sales', title: 'Field Sales', openings: 4238, icon: '📈' },
  { id: 'business', title: 'Business Development', openings: 2383, icon: '💼' },
  { id: 'retail', title: 'Retail / Counter Sales', openings: 1715, icon: '🏪' },
];

const mockJobs = [
  {
    id: 1,
    title: 'Data Engineer - Snowflake',
    company: 'ProLegion',
    location: 'Hyderabad',
    salary: '₹90,000 - ₹100,000 monthly',
    tags: ['Work from Office', 'Full Time', 'Min. 3 years', 'Good English'],
  },
  {
    id: 2,
    title: 'O&M Maintenance Manager in Hyderabad',
    company: 'Reliance Jio',
    location: 'Hyderabad',
    salary: '₹70,000 - ₹130,000 monthly*',
    tags: ['Work from Office', 'Full Time', 'Min. 5 years', 'Basic English'],
  },
  {
    id: 3,
    title: 'Network Operations Center Analyst',
    company: 'Tech Solutions Hub',
    location: 'Remote',
    salary: '₹40,000 - ₹60,000 monthly',
    tags: ['Work from Home', 'Full Time', 'Min. 1 year', 'Fluent English'],
  }
];

const JobConnect = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [micState, setMicState] = useState('idle');

  // Voice Interaction Mock
  const handleMicClick = () => {
    if (micState === 'idle') {
      setMicState('listening');
      setTimeout(() => setMicState('processing'), 2000);
      setTimeout(() => {
        setMicState('idle');
        setSelectedCategory(categories[0]); // Simulate matching hardware network engineer
      }, 4000);
    }
  };

  // View 2: Job Listings (Category Selected)
  if (selectedCategory) {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-[#f3f4f6]">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 px-6 py-6 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex flex-col">
            <button 
              onClick={() => setSelectedCategory(null)}
              className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4 w-max font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Categories
            </button>
            <h1 className="text-2xl font-bold text-[#1e293b]">
              {selectedCategory.title} Jobs - {selectedCategory.openings} Verified Vacancies
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 p-6 flex-1">
          {/* Left Sidebar: Filters */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-28">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filters (1)
                </h3>
                <button className="text-sm text-[#00875a] font-medium hover:underline">Clear all</button>
              </div>

              {/* Filter Section: Date Posted */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Date posted</h4>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-[#00875a]">
                      <div className="w-2 h-2 rounded-full bg-[#00875a]"></div>
                    </div>
                    <span className="text-sm text-gray-700">All</span>
                  </label>
                  {['Last 24 hours', 'Last 3 days', 'Last 7 days'].map(opt => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-gray-400"></div>
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter Section: Work Mode */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Work Mode</h4>
                <div className="space-y-2.5">
                  {['Work from home', 'Work from office', 'Work from field'].map(opt => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-4 h-4 rounded border border-gray-300 group-hover:border-gray-400 flex items-center justify-center"></div>
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content: Job Cards */}
          <div className="flex-1 space-y-4">
            {mockJobs.map(job => (
              <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#00875a] transition-colors">{job.title}</h2>
                    <p className="text-gray-500 font-medium text-sm mt-0.5">{job.company}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#00875a]" />
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span>{job.salary}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {job.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      {tag.includes('Office') ? <Building className="w-3 h-3" /> : null}
                      {tag}
                    </span>
                  ))}
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
    <div className="flex flex-col h-full overflow-y-auto bg-[#f3f4f6]">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 pt-10 pb-12 px-6 flex flex-col items-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Find Local Jobs</h1>
        <p className="text-gray-500 font-medium mb-8">Use your voice or type to discover opportunities</p>

        <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
          <div className="relative group">
             {micState === 'listening' && (
              <div className="absolute -inset-4 bg-[#00875a]/20 rounded-full animate-ping"></div>
            )}
            {micState === 'processing' && (
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#00875a] via-[#00b075] to-[#00875a] rounded-full animate-spin"></div>
            )}
            <button
              onClick={handleMicClick}
              className={`
                relative flex items-center justify-center w-16 h-16 rounded-full shadow-md transition-all duration-300 z-10 border
                ${micState === 'idle' ? 'bg-white border-gray-200 hover:border-[#00875a] text-gray-700 hover:text-[#00875a]' : ''}
                ${micState === 'listening' ? 'bg-[#00875a] border-transparent text-white scale-110' : ''}
                ${micState === 'processing' ? 'bg-white border-transparent text-[#00875a]' : ''}
              `}
            >
              <Mic className={`w-7 h-7 ${micState === 'listening' ? 'animate-pulse' : ''}`} />
            </button>
          </div>
          
          <p className={`text-sm font-bold ${micState === 'idle' ? 'text-gray-500' : 'text-[#00875a] animate-pulse'}`}>
            {micState === 'idle' && "Tap to speak your skills"}
            {micState === 'listening' && "Listening..."}
            {micState === 'processing' && "Finding matching categories..."}
          </p>

          <div className="w-full relative mt-4">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search jobs by title, company or skill..." 
              className="w-full bg-white border border-gray-300 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#00875a] focus:border-transparent shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto w-full px-6 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Explore Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between group hover:border-[#00875a] hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">
                  {category.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-[#00875a] transition-colors line-clamp-1">{category.title}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">{category.openings.toLocaleString()} openings</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#00875a] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobConnect;
