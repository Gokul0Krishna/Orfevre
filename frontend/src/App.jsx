import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import RoleSelection from './pages/RoleSelection';
import YouthLayout from './pages/YouthLayout';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#FAFAF7]">Loading...</div>;
  }

  if (!user) {
    return <LandingPage />;
  }

  // role can be null (JS), or the python string "None" if not yet set
  const hasNoRole = !role || role === 'None' || role === 'none';

  if (user && hasNoRole) {
    return <RoleSelection />;
  }

  if (role === 'youth') {
    return <YouthLayout />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <GoogleOAuthProvider clientId="1071198674738-ltgfdrbur4vblqq0jh72j1h3odk8f874.apps.googleusercontent.com">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
