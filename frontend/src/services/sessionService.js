import api from './api';

export const sessionService = {
  // Lecturer endpoints
  createSession: (data) => api.post('/lecturer/sessions', data),
  getLecturerSessions: (params = {}) => api.get('/lecturer/sessions', { params }),
  getLecturerSessionById: (id) => api.get(`/lecturer/sessions/${id}`),
  startSession: (id) => api.post(`/lecturer/sessions/${id}/start`),
  cancelSession: (id, data) => api.post(`/lecturer/sessions/${id}/cancel`, data),
  finalizeSession: (id, data = {}) => api.post(`/lecturer/sessions/${id}/finalize`, data),
  getSessionSummary: (id) => api.get(`/lecturer/sessions/${id}/summary`),
  getFormOptions: () => api.get('/lecturer/sessions/form-options'),
  getDashboard: () => api.get('/lecturer/sessions/dashboard'),

  // Admin endpoints
  getAllSessions: (params = {}) => api.get('/admin/sessions', { params }),
  getAdminSessionById: (id) => api.get(`/admin/sessions/${id}`),
  getAdminSessionSummary: (id) => api.get(`/admin/sessions/${id}/summary`),
};

export default sessionService;

