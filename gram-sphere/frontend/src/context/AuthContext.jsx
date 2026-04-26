import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If we have a token but no user, we could decode the JWT to get the user data
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.user_id, email: payload.email, name: payload.name });
        setRole(payload.role);
      } catch (e) {
        console.error("Failed to decode token", e);
        logout();
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    if (userData) {
      setUser(userData);
      setRole(userData.role);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  const updateRole = (newRole, newToken) => {
    if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    }
    setRole(newRole);
  }

  return (
    <AuthContext.Provider value={{ user, role, token, isLoading, login, logout, updateRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
