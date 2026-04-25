import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return isLoggedIn ? (
    <Dashboard />
  ) : (
    <LandingPage onLogin={() => setIsLoggedIn(true)} />
  );
}

export default App;
