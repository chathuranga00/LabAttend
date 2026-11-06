import React, { createContext, useContext, useState, useEffect } from 'react';
import { studentAuthService, studentPortalService } from '../services/studentService';

const StudentAuthContext = createContext(null);

export const StudentAuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('student_token'));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('student_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [studentProfile, setStudentProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load authenticated student profile on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('student_token');
      if (storedToken) {
        try {
          const profileRes = await studentPortalService.getProfile();
          if (profileRes.success && profileRes.data) {
            setStudentProfile(profileRes.data);
          }
        } catch {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          setStudentProfile(null);
          localStorage.removeItem('student_token');
          localStorage.removeItem('student_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await studentAuthService.login(email, password);
      if (res.success && res.data) {
        const { token: receivedToken, user: userSummary } = res.data;
        
        // Ensure student role
        if (userSummary?.role !== 'STUDENT') {
          throw new Error('Access denied. This portal is exclusively for students.');
        }

        setToken(receivedToken);
        setUser(userSummary);
        localStorage.setItem('student_token', receivedToken);
        localStorage.setItem('student_user', JSON.stringify(userSummary));

        // Fetch student profile details
        try {
          const profileRes = await studentPortalService.getProfile();
          if (profileRes.success) {
            setStudentProfile(profileRes.data);
          }
        } catch {
          // Fallback profile if profile fetch delayed
        }

        return res;
      }
      throw new Error(res.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await studentAuthService.logout();
    } finally {
      setToken(null);
      setUser(null);
      setStudentProfile(null);
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_user');
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await studentPortalService.getProfile();
      if (res.success) {
        setStudentProfile(res.data);
      }
    } catch {
      // silent
    }
  };

  const value = {
    user,
    studentProfile,
    token,
    isAuthenticated: !!token && user?.role === 'STUDENT',
    isLoading,
    login,
    logout,
    refreshProfile,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};
