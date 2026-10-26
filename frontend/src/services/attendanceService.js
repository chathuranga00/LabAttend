import api from './api';

export const attendanceService = {
  scanQr: (sessionId, identifier) =>
    api.post(`/lecturer/sessions/${sessionId}/scan`, { identifier }),

  recordManualAttendance: (sessionId, data) =>
    api.post(`/lecturer/sessions/${sessionId}/manual-attendance`, data),

  getSessionAttendance: (sessionId, params = {}) =>
    api.get(`/lecturer/sessions/${sessionId}/attendance`, { params }),

  getExpectedStudents: (sessionId, query = '') =>
    api.get(`/lecturer/sessions/${sessionId}/expected-students`, {
      params: query ? { query } : {},
    }),
};

export default attendanceService;
