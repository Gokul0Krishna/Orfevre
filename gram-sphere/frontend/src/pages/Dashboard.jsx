import React, { useState } from 'react';
import AppHeader from '../components/AppHeader';
import LanguagePrompt from '../components/LanguagePrompt';
import ChatbotWidget from '../components/ChatbotWidget';
import JobConnect from '../views/JobConnect';
import Profile from '../views/Profile';
import BazaarPulse from '../views/BazaarPulse';
import GramLens from '../views/GramLens';
import ApplicationsView from '../views/ApplicationsView';
import MyGigs from '../views/MyGigs';
import MyShop from '../views/MyShop';
import RecruitmentChat from '../views/RecruitmentChat';
import DistrictSummary from '../views/DistrictSummary';

import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { role } = useAuth();

  // Default view per role
  const getDefaultView = () => {
    if (role === 'merchant') return 'applications';
    if (role === 'official') return 'gramlens';
    return 'jobconnect';
  };

  const [activeView, setActiveView] = useState(getDefaultView());

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF7] font-sans">
      <LanguagePrompt />
      <AppHeader activeView={activeView} setActiveView={setActiveView} />

      {/* pt-16 pushes content below the fixed header */}
      <main className="flex-1 pt-16 relative overflow-auto">
        {activeView === 'jobconnect'       && <JobConnect />}
        {activeView === 'profile'          && <Profile />}
        {activeView === 'youth_profile'    && <Profile />}
        {activeView === 'bazaarpulse'      && <BazaarPulse />}
        {activeView === 'gramlens'         && <GramLens />}
        {activeView === 'applications'     && <ApplicationsView />}
        {activeView === 'my_gigs'          && <MyGigs />}
        {activeView === 'merchant_home'    && <MyShop />}
        {activeView === 'recruitment_chat' && <RecruitmentChat />}
        {activeView === 'district_summary' && <DistrictSummary />}
      </main>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeView={activeView}
        setActiveView={setActiveView}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 relative bg-[#FAFAFA] overflow-hidden">
          {activeView === 'jobconnect' && <JobConnect />}
          {activeView === 'profile' && <Profile />}
          {activeView === 'bazaarpulse' && <BazaarPulse />}
          {activeView === 'gramlens' && <GramLens />}
          
          {/* Mock empty states for other views */}
          {activeView !== 'jobconnect' && 
           activeView !== 'profile' && 
           activeView !== 'bazaarpulse' && 
           activeView !== 'gramlens' && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">This view is not implemented yet.</p>
            </div>
          )}
        </main>
      </div>

      {/* Navigation Chatbot Assistant */}
      <ChatbotWidget />
    </div>
  );
};

export default Dashboard;

