import React, { useState, useEffect } from 'react';
import { ShoppingBag, TrendingUp, Package, Plus, Search, Tag, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { getDemandForecast, updateInventory, generateListing } from '../api';
import { useAuth } from '../context/AuthContext';

const BazaarPulse = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Hand-woven Silk Saree', stock: 12, price: 4500, category: 'Apparel' },
    { id: 2, name: 'Terracotta Vase', stock: 5, price: 850, category: 'Home Decor' },
  ]);
  const [forecast, setForecast] = useState(null);
  const [listingText, setListingText] = useState("");
  const [generatedListing, setGeneratedListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  // Load forecast on mount
  useEffect(() => {
    setLoading(true);
    getDemandForecast('Weaver', 'Mysuru', 'May', ['Saree', 'Dhoti'])
      .then(setForecast)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateStock = async (id, newStock) => {
    const newInv = inventory.map(item => item.id === id ? { ...item, stock: newStock } : item);
    setInventory(newInv);
    try {
      await updateInventory(user?.id || 'unknown', newInv);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateListing = async () => {
    if (!listingText) return;
    setGenLoading(true);
    try {
      const result = await generateListing(user?.id || 'unknown', listingText, 'Weaver', 'Mysuru');
      setGeneratedListing(result);
    } catch (e) {
      console.error(e);
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f3f4f6] p-6">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">BazaarPulse</h1>
          <p className="text-gray-500 font-medium">Market insights and smart inventory for vendors</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Inventory Management */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#00875a]" />
                  Inventory Management
                </h2>
                <button className="bg-[#00875a] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#006b47] flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 px-2">Item Name</th>
                      <th className="pb-3 px-2">Stock</th>
                      <th className="pb-3 px-2">Price (₹)</th>
                      <th className="pb-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {inventory.map(item => (
                      <tr key={item.id} className="text-sm">
                        <td className="py-4 px-2 font-bold text-gray-900">{item.name}</td>
                        <td className="py-4 px-2 text-gray-600">{item.stock} units</td>
                        <td className="py-4 px-2 text-gray-600">{item.price.toLocaleString()}</td>
                        <td className="py-4 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.stock < 10 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                            {item.stock < 10 ? 'Low Stock' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Smart Listing Generator */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Marketplace Assistant
              </h2>
              <p className="text-sm text-gray-500 mb-4 font-medium">Describe your product and our AI will generate a high-converting listing for the ONDC network.</p>
              
              <div className="space-y-4">
                <textarea 
                  value={listingText}
                  onChange={(e) => setListingText(e.target.value)}
                  placeholder="e.g. A hand-woven cotton saree with traditional Mysuru motifs in blue and gold..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00875a] min-h-[100px]"
                />
                <button 
                  onClick={handleGenerateListing}
                  disabled={genLoading || !listingText}
                  className="w-full bg-gradient-to-r from-purple-600 to-[#00875a] text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {genLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Smart Listing
                </button>
              </div>

              {generatedListing && (
                <div className="mt-6 p-5 bg-purple-50 border border-purple-100 rounded-xl animate-in slide-in-from-bottom-2 duration-500">
                  <h3 className="font-bold text-purple-900 mb-2">{generatedListing.title || "Generated Listing"}</h3>
                  <p className="text-sm text-purple-800 leading-relaxed">{generatedListing.description || generatedListing.optimized_description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {generatedListing.tags?.map(tag => (
                      <span key={tag} className="bg-white border border-purple-200 text-purple-600 text-xs font-bold px-2.5 py-1 rounded-md">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Demand Forecast & Insights */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#00875a]" />
                Demand Forecast
              </h2>
              
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#00875a] animate-spin" />
                  <p className="text-xs text-gray-500 mt-3 font-bold">Analyzing market trends...</p>
                </div>
              ) : forecast ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#00875a]/5 border border-[#00875a]/10 rounded-xl">
                    <p className="text-xs text-[#00875a] font-bold uppercase tracking-wider mb-1">Forecast for {forecast.forecast_month || 'Next Month'}</p>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{forecast.market_sentiment_summary}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trending Products</h3>
                    <div className="space-y-2">
                      {forecast.high_demand_items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm font-bold text-gray-900">{item}</span>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">High Demand</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {forecast.recommended_restock_timing && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                      <p className="text-xs text-blue-700 font-medium">{forecast.recommended_restock_timing}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-10">Forecast data unavailable.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BazaarPulse;
