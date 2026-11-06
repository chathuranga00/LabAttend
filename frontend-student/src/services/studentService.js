import api from './api';

export const studentAuthService = {
  login: async (email, password) => {
    const response = await api.post('/auth/student/login', { email, password });
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort logout
    } finally {
      localStorage.removeItem('student_token');
      localStorage.removeItem('student_user');
    }
  },

  activateAccount: async (token, newPassword, confirmPassword) => {
    const response = await api.post('/auth/student/activate', {
      token,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/student/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword, confirmPassword) => {
    const response = await api.post('/auth/student/reset-password', {
      token,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const studentPortalService = {
  getProfile: async () => {
    const response = await api.get('/student/me');
    return response.data;
  },

  getAttendanceSummary: async () => {
    const response = await api.get('/student/attendance/summary');
    return response.data;
  },

  getModuleAttendance: async () => {
    const response = await api.get('/student/attendance/modules');
    return response.data;
  },

  getAttendanceHistory: async (params = {}) => {
    const response = await api.get('/student/attendance/history', { params });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const response = await api.post('/student/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  getPersonalQrBadge: async () => {
    const response = await api.get('/student/me/qr-badge');
    return response.data;
  },
};

