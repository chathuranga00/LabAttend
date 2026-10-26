import api from './api';

export const degreeProgrammeService = {
  getProgrammes: (params = {}) => api.get('/admin/programmes', { params }),
  getProgrammeById: (id) => api.get(`/admin/programmes/${id}`),
  createProgramme: (data) => api.post('/admin/programmes', data),
  updateProgramme: (id, data) => api.put(`/admin/programmes/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/programmes/${id}/toggle-status`),
};

export const batchService = {
  getBatches: (params = {}) => api.get('/admin/batches', { params }),
  getBatchById: (id) => api.get(`/admin/batches/${id}`),
  createBatch: (data) => api.post('/admin/batches', data),
  updateBatch: (id, data) => api.put(`/admin/batches/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/batches/${id}/toggle-status`),
};

export const moduleService = {
  getModules: (params = {}) => api.get('/admin/modules', { params }),
  getModuleById: (id) => api.get(`/admin/modules/${id}`),
  createModule: (data) => api.post('/admin/modules', data),
  updateModule: (id, data) => api.put(`/admin/modules/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/modules/${id}/toggle-status`),
};

export const laboratoryHallService = {
  getHalls: (params = {}) => api.get('/admin/halls', { params }),
  getHallById: (id) => api.get(`/admin/halls/${id}`),
  createHall: (data) => api.post('/admin/halls', data),
  updateHall: (id, data) => api.put(`/admin/halls/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/halls/${id}/toggle-status`),
};

export const lecturerAssignmentService = {
  getAvailableLecturers: () => api.get('/admin/assignments/lecturers'),
  getAssignments: (params = {}) => api.get('/admin/assignments', { params }),
  getAssignmentById: (id) => api.get(`/admin/assignments/${id}`),
  createAssignment: (data) => api.post('/admin/assignments', data),
  toggleStatus: (id) => api.patch(`/admin/assignments/${id}/toggle-status`),
  deleteAssignment: (id) => api.delete(`/admin/assignments/${id}`),
};

export const studentService = {
  getStudents: (params = {}) => api.get('/admin/students', { params }),
  getStudentById: (id) => api.get(`/admin/students/${id}`),
  createStudent: (data) => api.post('/admin/students', data),
  updateStudent: (id, data) => api.put(`/admin/students/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/students/${id}/toggle-status`),
  getAttendanceHistory: (id) => api.get(`/admin/students/${id}/attendance`),
  importCsv: (formData) =>
    api.post('/admin/students/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const lecturerService = {
  getLecturers: (params = {}) => api.get('/admin/lecturers', { params }),
  getLecturerById: (id) => api.get(`/admin/lecturers/${id}`),
  createLecturer: (data) => api.post('/admin/lecturers', data),
  updateLecturer: (id, data) => api.put(`/admin/lecturers/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/lecturers/${id}/toggle-status`),
  resetAccess: (id) => api.post(`/admin/lecturers/${id}/reset-access`),
};
