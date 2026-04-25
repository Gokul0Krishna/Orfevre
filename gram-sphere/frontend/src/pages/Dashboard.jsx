import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import LanguagePrompt from '../components/LanguagePrompt';
import JobConnect from '../views/JobConnect';
import Profile from '../views/Profile';
import BazaarPulse from '../views/BazaarPulse';
import GramLens from '../views/GramLens';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('jobconnect');

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-[#1D1C1D] overflow-hidden font-sans">
      <LanguagePrompt />
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
    </div>
  );
};

export default Dashboard;
