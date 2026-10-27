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

  correctAttendance: (sessionId, recordId, data) =>
    api.post(`/lecturer/sessions/${sessionId}/attendance/${recordId}/correct`, data),

  adminCorrectAttendance: (sessionId, recordId, data) =>
    api.post(`/admin/sessions/${sessionId}/attendance/${recordId}/correct`, data),

  getAdminAttendance: (params = {}) =>
    api.get('/admin/attendance', { params }),

  getAdminAuditLogs: (params = {}) =>
    api.get('/admin/audits', { params }),
};

export default attendanceService;

