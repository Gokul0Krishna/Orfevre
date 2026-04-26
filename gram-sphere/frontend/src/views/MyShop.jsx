import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMerchantShop, saveMerchantShop } from '../api';
import {
  Store, MapPin, Phone, Clock, CheckCircle,
  Loader2, Edit3, Save, ChevronDown, Camera, Navigation, AlertCircle
} from 'lucide-react';

const BUSINESS_TYPES = [
  "Tailor", "Carpenter", "Electronics Repair", "Potter",
  "Weaver", "Cobbler", "Blacksmith", "Farmer",
  "Grocery / Kirana", "Food & Catering", "Photography",
  "Plumbing", "Painting", "Other"
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DISTRICTS = [
  "Hubli", "Dharwad", "Belagavi", "Mysuru", "Bengaluru",
  "Bidar", "Kalaburagi", "Mangaluru", "Shivamogga", "Tumakuru", "Other"
];

/* ── Reverse geocode via free Nominatim API ─────────────────────────── */
const reverseGeocode = async (lat, lon) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const area =
      addr.neighbourhood || addr.suburb || addr.village ||
      addr.town || addr.county || addr.state_district || '';
    const district =
      addr.state_district || addr.county || addr.city || '';
    return { area, district, fullAddress: data.display_name || '' };
  } catch {
    return { area: '', district: '', fullAddress: '' };
  }
};

/* ── Shared Input ───────────────────────────────────────────────────── */
const InputField = ({ label, icon: Icon, required, ...props }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <Icon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}
      <input
        className={`w-full border border-gray-200 rounded-xl py-3 pr-4 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/40 focus:border-[#2D6A4F] transition ${Icon ? 'pl-10' : 'pl-4'}`}
        {...props}
      />
    </div>
  </div>
);

/* ── Main Component ─────────────────────────────────────────────────── */
const MyShop = () => {
  const { user } = useAuth();
  const fileRef = useRef();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [shop, setShop] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    shop_name: '',
    business_type: '',
    description: '',
    district: '',
    area: '',
    lat: null,
    lon: null,
    phone: '',
    open_time: '9:00 AM',
    close_time: '7:00 PM',
    days_open: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    shop_image: '',  // base64
  });

  /* Load existing shop */
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getMerchantShop(user.id)
      .then(data => {
        if (data.shop) {
          setShop(data.shop);
          setForm({
            shop_name: data.shop.shop_name || '',
            business_type: data.shop.business_type || '',
            description: data.shop.description || '',
            district: data.shop.district || '',
            area: data.shop.area || '',
            lat: data.shop.lat || null,
            lon: data.shop.lon || null,
            phone: data.shop.phone || '',
            open_time: data.shop.open_time || '9:00 AM',
            close_time: data.shop.close_time || '7:00 PM',
            days_open: data.shop.days_open || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            shop_image: data.shop.shop_image || '',
          });
        } else {
          setIsEditing(true); // first-time setup
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleDay = (day) =>
    setForm(prev => ({
      ...prev,
      days_open: prev.days_open.includes(day)
        ? prev.days_open.filter(d => d !== day)
        : [...prev.days_open, day],
    }));

  /* ── Auto-detect location ── */
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setForm(prev => ({
          ...prev,
          lat: latitude,
          lon: longitude,
          area: geo.area || prev.area,
          district: geo.district || prev.district,
        }));
        setErrors(prev => ({ ...prev, area: '', district: '' }));
        setLocationLoading(false);
      },
      (err) => {
        setLocationError('Could not get location. Please allow location access.');
        setLocationLoading(false);
      },
      { timeout: 10000 }
    );
  };

  /* ── Shop image upload ── */
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => handleChange('shop_image', reader.result);
    reader.readAsDataURL(file);
  };

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.shop_name.trim())   e.shop_name = 'Shop name is required';
    if (!form.business_type)      e.business_type = 'Select a business type';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.district)           e.district = 'District is required';
    if (!form.area.trim())        e.area = 'Area is required — use "Detect Location" or type it';
    if (!form.phone.trim())       e.phone = 'Phone number is required';
    if (!form.days_open.length)   e.days_open = 'Select at least one day';
    return e;
  };

  /* ── Save ── */
  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await saveMerchantShop({ ...form, merchant_uid: user.id });
      setShop({ ...form, merchant_uid: user.id });
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ────────────────── RENDER ────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#FAFAF7] pb-20">
      <div className="max-w-3xl mx-auto px-6 pt-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1D1C1D] flex items-center gap-3">
              <Store className="w-8 h-8 text-[#2D6A4F]" />
              My Shop
            </h1>
            <p className="text-gray-500 mt-1 font-medium">
              {shop ? 'Your public business profile on YuvaShakti' : 'Set up your shop to start hiring local talent'}
            </p>
          </div>
          {shop && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Edit Shop
            </button>
          )}
        </div>

        {/* Success Banner */}
        {saved && (
          <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700 font-bold text-sm">Shop profile saved to Firebase!</p>
          </div>
        )}

        {/* ───── VIEW MODE ───── */}
        {shop && !isEditing ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Banner / Cover Image */}
            <div
              className="h-48 bg-gradient-to-r from-[#2D6A4F] to-[#52B788] relative flex items-end"
              style={shop.shop_image ? {
                backgroundImage: `url(${shop.shop_image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/30">
                {shop.business_type}
              </div>
            </div>

            {/* Shop Details */}
            <div className="px-6 pb-6">
              <div className="flex items-end gap-5 -mt-6 mb-4">
                <div className="w-16 h-16 bg-white border-4 border-white rounded-2xl shadow-md flex items-center justify-center text-3xl flex-shrink-0">
                  🏪
                </div>
              </div>

              <h2 className="text-2xl font-extrabold text-[#1D1C1D]">{shop.shop_name}</h2>
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mt-1">
                <MapPin className="w-4 h-4" /> {shop.area}, {shop.district}
                <span className="text-green-600 font-bold ml-1">• Open</span>
              </div>

              {shop.phone && (
                <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                  <Phone className="w-4 h-4" /> {shop.phone}
                </div>
              )}

              <p className="mt-4 text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                {shop.description}
              </p>

              <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                <Clock className="w-4 h-4 text-[#2D6A4F]" />
                {shop.open_time} – {shop.close_time}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {DAYS.map(day => (
                  <span
                    key={day}
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      shop.days_open?.includes(day)
                        ? 'bg-[#2D6A4F] text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
        /* ───── EDIT / CREATE FORM ───── */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">

            {/* ── Shop Cover Image ── */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Shop Cover Photo <span className="text-red-400">*</span>
              </label>
              <div
                className="relative w-full h-40 rounded-2xl overflow-hidden bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#2D6A4F] transition-colors group"
                onClick={() => fileRef.current?.click()}
              >
                {form.shop_image ? (
                  <>
                    <img src={form.shop_image} alt="Shop" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white" />
                      <span className="text-white font-bold ml-2">Change Photo</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Camera className="w-10 h-10" />
                    <span className="text-sm font-semibold">Click to upload shop photo</span>
                    <span className="text-xs">JPG, PNG — max 2 MB</span>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Basic Details</p>

            <InputField
              label="Shop / Business Name"
              required
              icon={Store}
              placeholder="e.g. Raju Electronics"
              value={form.shop_name}
              onChange={e => handleChange('shop_name', e.target.value)}
            />
            {errors.shop_name && <p className="text-red-500 text-xs -mt-4">{errors.shop_name}</p>}

            {/* Business Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Business Type <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.business_type}
                  onChange={e => handleChange('business_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/40 focus:border-[#2D6A4F] appearance-none"
                >
                  <option value="">Select type…</option>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.business_type && <p className="text-red-500 text-xs mt-1">{errors.business_type}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Tell youth about your business, what work you offer, skills needed…"
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                maxLength={300}
                className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/40 focus:border-[#2D6A4F] resize-none"
              />
              <div className="flex justify-between mt-0.5">
                {errors.description
                  ? <p className="text-red-500 text-xs">{errors.description}</p>
                  : <span />}
                <p className="text-xs text-gray-400">{form.description.length}/300</p>
              </div>
            </div>

            {/* ── Location ── */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</p>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#1b4332] text-white px-4 py-2 rounded-full text-xs font-bold transition-colors disabled:opacity-60"
                >
                  {locationLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Navigation className="w-3.5 h-3.5" />}
                  {locationLoading ? 'Detecting…' : 'Detect My Location'}
                </button>
              </div>

              {locationError && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {locationError}
                </div>
              )}

              {form.lat && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2 mb-4 text-xs font-medium">
                  <CheckCircle className="w-4 h-4" /> Location detected automatically
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    District <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.district}
                      onChange={e => handleChange('district', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/40 focus:border-[#2D6A4F] appearance-none"
                    >
                      <option value="">Select…</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
                </div>

                <InputField
                  label="Area / Locality"
                  required
                  icon={MapPin}
                  placeholder="Auto-filled or type here"
                  value={form.area}
                  onChange={e => handleChange('area', e.target.value)}
                />
                {errors.area && <p className="text-red-500 text-xs -mt-4 col-span-2">{errors.area}</p>}
              </div>
            </div>

            {/* ── Contact ── */}
            <div className="border-t border-gray-100 pt-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact</p>
              <InputField
                label="Phone Number"
                required
                icon={Phone}
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* ── Hours ── */}
            <div className="border-t border-gray-100 pt-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Working Hours <span className="text-red-400">*</span></p>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <InputField
                  label="Opens At"
                  icon={Clock}
                  placeholder="9:00 AM"
                  value={form.open_time}
                  onChange={e => handleChange('open_time', e.target.value)}
                />
                <InputField
                  label="Closes At"
                  icon={Clock}
                  placeholder="7:00 PM"
                  value={form.close_time}
                  onChange={e => handleChange('close_time', e.target.value)}
                />
              </div>

              <label className="block text-sm font-bold text-gray-700 mb-2">
                Days Open <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                      form.days_open.includes(day)
                        ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-[#2D6A4F]'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {errors.days_open && <p className="text-red-500 text-xs mt-1">{errors.days_open}</p>}
            </div>

            {/* Save */}
            <div className="pt-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#2D6A4F] hover:bg-[#1b4332] text-white py-3.5 rounded-2xl font-extrabold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving to Firebase…' : 'Save Shop Profile'}
              </button>
              {shop && (
                <button
                  onClick={() => { setIsEditing(false); setErrors({}); }}
                  className="px-6 border border-gray-200 rounded-2xl font-bold text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default MyShop;
