import React from 'react';
import { Bell, LogOut, Home, Briefcase, Store, Map, BarChart2, Target, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/roleGuard';

const ROLE_LABELS = {
  merchant: 'Merchant / विक्रेता',
  official: 'Official / अधिकारी',
  youth: 'Youth / युवा',
};

const NAV_LINKS = [
  { id: 'jobconnect',       label: 'JobConnect',    icon: Briefcase, roles: ['youth'] },
  { id: 'verification',     label: 'Verification',  icon: ShieldCheck, roles: ['youth'] },
  { id: 'merchant_home',    label: 'My Shop',       icon: Store,    roles: ['merchant'] },
  { id: 'applications',     label: 'Applications',  icon: Briefcase, roles: ['merchant'] },
  { id: 'recruitment_chat', label: 'Recruit',       icon: Target,   roles: ['merchant'] },
  { id: 'bazaarpulse',      label: 'BazaarPulse',   icon: BarChart2, roles: ['merchant'] },
  { id: 'gramlens',         label: 'GramLens',      icon: Map,      roles: ['official'] },
  { id: 'district_summary', label: 'District',      icon: BarChart2, roles: ['official'] },
];

const AppHeader = ({ activeView, setActiveView }) => {
  const { user, role, logout, updateRole } = useAuth();
  const [showMenu, setShowMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const links = NAV_LINKS.filter(l => canAccess(role, l.id));

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setActiveView(links[0]?.id || 'jobconnect')}
        >
          <svg className="w-6 h-6 text-[#007B55]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="text-[#1D1C1D] font-bold tracking-tight text-lg">YuvaShakti</span>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = activeView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveView(link.id)}
                className={`flex items-center gap-1.5 font-semibold text-sm transition-colors ${isActive ? 'text-[#007B55]' : 'text-gray-600 hover:text-[#1D1C1D]'}`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Role Chip */}
          <div className="hidden md:flex items-center bg-green-50 text-[#007B55] px-3 py-1 rounded-full border border-green-200">
            <span className="text-xs font-bold">{ROLE_LABELS[role] || role}</span>
          </div>

          {/* Bell Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(prev => !prev); setShowMenu(false); }}
              className="text-gray-500 hover:text-gray-900 transition-colors relative mt-1"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg w-72 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                  <span className="text-[10px] bg-[#007B55] text-white px-2 py-0.5 rounded-full">2 New</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <p className="text-xs font-semibold text-gray-900">New Application</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Someone applied for your recent gig posting.</p>
                    <p className="text-[10px] text-blue-500 font-medium mt-1">Just now</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-xs font-semibold text-gray-900">Tokens Earned</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">You earned 50 tokens for setting up your profile.</p>
                    <p className="text-[10px] text-gray-400 mt-1">1 day ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-center bg-gray-50">
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-bold text-[#007B55] hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowMenu(prev => !prev); setShowNotifications(false); }}
              className="w-8 h-8 rounded-full bg-[#007B55] flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-transparent hover:ring-[#007B55]/30 transition-all"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-44 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-gray-400 capitalize">{role}</p>
                </div>
                <button
                  onClick={() => { updateRole(null); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2 mt-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Switch Role
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => { logout(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 flex items-center gap-2 mt-1"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
