import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { updateUser } from '../api';
import { Globe } from 'lucide-react';

const CURRENT_USER_ID = 'user_001';

const LanguagePrompt = () => {
  const { t, i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');
  const [saving, setSaving] = useState(false);

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' }
  ];

  useEffect(() => {
    // Check if the user has already selected a language.
    // In a real app, we'd check the user data fetched from the backend.
    // Here we use localStorage to simulate if the prompt was shown during this session.
    const hasSelected = localStorage.getItem('languagePreferenceSet');
    if (!hasSelected) {
      setIsVisible(true);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      i18n.changeLanguage(selectedLang);
      await updateUser(CURRENT_USER_ID, { languagePreference: selectedLang });
      localStorage.setItem('languagePreferenceSet', 'true');
      setIsVisible(false);
    } catch (err) {
      console.error('Failed to save language preference:', err);
      // Still close it so they aren't stuck if backend is offline
      localStorage.setItem('languagePreferenceSet', 'true');
      setIsVisible(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 text-center border-b border-gray-100">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 text-[#00875a]" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">{t('lang_prompt.title', 'Select your language')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('lang_prompt.subtitle', 'Choose a language for your experience')}</p>
        </div>
        
        <div className="p-6 space-y-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                selectedLang === lang.code 
                  ? 'border-[#00875a] bg-green-50/50' 
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="flex flex-col text-left">
                <span className={`font-bold ${selectedLang === lang.code ? 'text-[#00875a]' : 'text-gray-900'}`}>
                  {lang.native}
                </span>
                <span className="text-xs text-gray-500 font-medium">{lang.name}</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedLang === lang.code ? 'border-[#00875a]' : 'border-gray-300'
              }`}>
                {selectedLang === lang.code && <div className="w-2.5 h-2.5 rounded-full bg-[#00875a]"></div>}
              </div>
            </button>
          ))}
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#00875a] hover:bg-[#006b47] text-white font-bold py-3.5 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? '...' : t('lang_prompt.save', 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguagePrompt;
