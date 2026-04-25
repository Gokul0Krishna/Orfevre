import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import JobConnect from '../views/JobConnect';
import Profile from '../views/Profile';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('jobconnect');

  return (
    <div className="flex h-screen bg-[#f3f4f6] text-gray-900 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeView={activeView}
        setActiveView={setActiveView}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 relative bg-[#f3f4f6] overflow-hidden">
          {activeView === 'jobconnect' && <JobConnect />}
          {activeView === 'profile' && <Profile />}
          {/* Mock empty states for other views */}
          {activeView !== 'jobconnect' && activeView !== 'profile' && (
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
