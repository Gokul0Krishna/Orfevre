import React from 'react';
import { Home, Briefcase, Map, Target, User, Store, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/roleGuard';

const Sidebar = ({ isOpen, onClose, activeView, setActiveView }) => {
  const { t } = useTranslation();
  const { user, role } = useAuth();

  const allLinks = [
    { id: 'jobconnect', name: t('sidebar.jobconnect', 'JobConnect'), icon: Target },
    { id: 'youth_profile', name: t('sidebar.profile', 'My Profile'), icon: User },
    { id: 'my_gigs', name: t('sidebar.my_gigs', 'My Gigs'), icon: Briefcase },
    { id: 'merchant_home', name: t('sidebar.merchant_home', 'My Shop'), icon: Store },
    { id: 'recruitment_chat', name: t('sidebar.recruitment', 'Recruitment'), icon: Target },
    { id: 'applications', name: t('sidebar.applications', 'Applications'), icon: Briefcase },
    { id: 'bazaarpulse', name: t('sidebar.bazaarpulse', 'BazaarPulse'), icon: Briefcase },
    { id: 'gramlens', name: t('sidebar.gramlens', 'GramLens'), icon: Map },
    { id: 'district_summary', name: t('sidebar.district_summary', 'District Summary'), icon: BarChart2 },
  ];

  const links = allLinks.filter(link => canAccess(role, link.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full w-[240px] bg-white border-r border-gray-200 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex-shrink-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span className="text-[#1D1C1D] font-bold tracking-tight text-lg">YuvaShakti</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-6 px-4 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = activeView === link.id;
              return (
               <button
                  key={link.id}
                  onClick={() => {
                    setActiveView(link.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-bold' 
                      : 'text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  {link.name}
                </button>
              );
            })}
          </nav>

          {/* Bottom Area */}
          <div className="p-4 border-t border-gray-100 m-4 rounded-xl bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#1D1C1D]">{user?.name || t('sidebar.user_profile', 'User Profile')}</span>
                <span className="text-xs font-medium text-gray-500 capitalize">{role || t('sidebar.youth_account', 'Youth Account')}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
