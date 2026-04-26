import React, { useState } from 'react';
import { Menu, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { updateUser } from '../api';

const CURRENT_USER_ID = 'user_001'; // Mock user

const Header = ({ onOpenSidebar, onLogout }) => {
  const { t, i18n } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'mr', name: 'मराठी' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'ta', name: 'தமிழ்' }
  ];

  const handleLanguageChange = async (langCode) => {
    i18n.changeLanguage(langCode);
    setIsLangMenuOpen(false);
    
    // Save preference to backend
    try {
      await updateUser(CURRENT_USER_ID, { languagePreference: langCode });
    } catch (err) {
      console.error('Failed to sync language preference:', err);
    }
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger Menu */}
        <button 
          onClick={onOpenSidebar}
          className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Page Title (Mobile only) */}
        <span className="md:hidden text-gray-900 font-bold tracking-tight text-lg">YuvaShakti</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Language Toggle Dropdown */}
        <div className="relative hidden sm:block">
          <button 
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer transition-colors text-sm font-semibold shadow-sm"
          >
            <Globe className="w-4 h-4" />
            <span>{currentLang.name}</span>
          </button>

          {isLangMenuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${i18n.language === lang.code ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700 font-medium'}`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-2 md:gap-3 ml-2">
          <button onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
