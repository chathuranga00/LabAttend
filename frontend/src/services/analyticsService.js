import api from './api';

export const analyticsService = {
  // Lecturer Analytics Endpoints
  getLecturerOverview: (params = {}) =>
    api.get('/lecturer/analytics/overview', { params }),

  getLecturerAttendanceTrends: (params = {}) =>
    api.get('/lecturer/analytics/attendance-trends', { params }),

  getLecturerSessions: (params = {}) =>
    api.get('/lecturer/analytics/sessions', { params }),

  getLecturerStudents: (params = {}) =>
    api.get('/lecturer/analytics/students', { params }),

  getLecturerStudentDetails: (studentId, params = {}) =>
    api.get(`/lecturer/analytics/students/${studentId}`, { params }),

  getLecturerModules: (params = {}) =>
    api.get('/lecturer/analytics/modules', { params }),

  getLecturerBatches: (params = {}) =>
    api.get('/lecturer/analytics/batches', { params }),

  // Admin Analytics Endpoints
  getAdminOverview: (params = {}) =>
    api.get('/admin/analytics/overview', { params }),

  getAdminAttendanceTrends: (params = {}) =>
    api.get('/admin/analytics/attendance-trends', { params }),

  getAdminSessions: (params = {}) =>
    api.get('/admin/analytics/sessions', { params }),

  getAdminStudents: (params = {}) =>
    api.get('/admin/analytics/students', { params }),

  getAdminStudentDetails: (studentId, params = {}) =>
    api.get(`/admin/analytics/students/${studentId}`, { params }),

  getAdminModules: (params = {}) =>
    api.get('/admin/analytics/modules', { params }),

  getAdminBatches: (params = {}) =>
    api.get('/admin/analytics/batches', { params }),
};

export default analyticsService;
