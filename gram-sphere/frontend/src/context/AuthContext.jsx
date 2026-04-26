import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Try to decode a backend-issued JWT (has 3 dot-separated base64 parts)
function tryDecodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    // Must have at least user_id or sub to be a valid JWT
    if (!payload.user_id && !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

function normalizeRole(r) {
  if (!r || r === 'None' || r === 'none') return null;
  return r;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Case 1: backend JWT — decode directly
    const payload = tryDecodeJWT(token);
    if (payload) {
      setUser({
        id: payload.user_id || payload.sub,
        email: payload.email,
        name: payload.name,
      });
      setRole(normalizeRole(payload.role) || normalizeRole(localStorage.getItem('role')));
      setIsLoading(false);
      return;
    }

    // Case 2: Google access token (fallback) — fetch userinfo
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        setRole(normalizeRole(u.role) || normalizeRole(localStorage.getItem('role')));
        setIsLoading(false);
        return;
      } catch {}
    }

    // Fetch from Google userinfo endpoint
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Token expired or invalid');
        return r.json();
      })
      .then((info) => {
        const u = {
          id: info.sub,
          email: info.email,
          name: info.name || info.email,
          picture: info.picture,
          role: normalizeRole(localStorage.getItem('role')),
        };
        setUser(u);
        setRole(u.role);
        localStorage.setItem('user_data', JSON.stringify(u));
      })
      .catch((err) => {
        console.warn('Could not verify Google token, logging out:', err);
        logout();
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    if (userData) {
      setUser(userData);
      setRole(userData.role);
      localStorage.setItem('user_data', JSON.stringify(userData));
      if (userData.role) localStorage.setItem('role', userData.role);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('role');
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
    localStorage.setItem('role', newRole);
    // Update cached user_data role too
    const saved = localStorage.getItem('user_data');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        u.role = newRole;
        localStorage.setItem('user_data', JSON.stringify(u));
      } catch {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, token, isLoading, login, logout, updateRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
