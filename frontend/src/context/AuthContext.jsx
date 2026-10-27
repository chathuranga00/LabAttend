import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('labattend_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('labattend_token') || null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.post('/auth/logout').catch(() => {});
      }
    } finally {
      localStorage.removeItem('labattend_token');
      localStorage.removeItem('labattend_user');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  // Handle unauthorized event from Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('labattend:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('labattend:unauthorized', handleUnauthorized);
  }, [logout]);

  // Verify token and restore session on application mount
  useEffect(() => {
    const verifyToken = async () => {
      const existingToken = localStorage.getItem('labattend_token');
      if (!existingToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const userProfile = response.data || response;
        setUser(userProfile);
        localStorage.setItem('labattend_user', JSON.stringify(userProfile));
      } catch (err) {
        // Token invalid or expired
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [logout]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const payload = response.data || response;
    const { token: receivedToken, user: receivedUser } = payload;

    localStorage.setItem('labattend_token', receivedToken);
    localStorage.setItem('labattend_user', JSON.stringify(receivedUser));

    setToken(receivedToken);
    setUser(receivedUser);

    return {
      success: true,
      role: receivedUser.role,
      user: receivedUser
    };
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
