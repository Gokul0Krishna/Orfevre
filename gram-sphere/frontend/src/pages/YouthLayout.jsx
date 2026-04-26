import React, { useState } from 'react';
import YouthHeader from '../components/YouthHeader';
import YouthHome from '../views/YouthHome';
import Profile from '../views/Profile';

const YouthLayout = () => {
  const [activeView, setActiveView] = useState('home');

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF7] font-sans">
      <YouthHeader activeView={activeView} setActiveView={setActiveView} />
      
      {/* 
        Add padding-top so the content isn't hidden under the fixed transparent header.
        h-16 = pt-16, plus a little extra if we want spacing.
      */}
      <main className="flex-1 pt-16 relative">
        {activeView === 'home' && <YouthHome />}
        {activeView === 'profile' && <Profile />}
      </main>
    </div>
  );
};

export default YouthLayout;
