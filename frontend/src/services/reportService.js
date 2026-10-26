import api from './api';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * Helper to download a binary file blob with filename extraction
 */
const downloadFileBlob = async (endpoint, params, defaultFilename) => {
  const token = localStorage.getItem('labattend_token');
  const response = await axios.get(`${BASE_URL}${endpoint}`, {
    params,
    responseType: 'blob',
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });

  // Extract filename from Content-Disposition header if available
  let filename = defaultFilename;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  // Create browser download link
  const blob = new Blob([response.data], { type: response.headers['content-type'] });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reportService = {
  // =========================================================================
  // ADMIN REPORTS
  // =========================================================================
  getAdminReportPreview: async (type, params) => {
    return await api.get(`/admin/reports/${type}/preview`, { params });
  },

  downloadAdminReport: async (type, format, params) => {
    const ext = format === 'PDF' ? 'pdf' : format === 'EXCEL' ? 'xlsx' : 'csv';
    const defaultFilename = `labattend-${type.toLowerCase()}-${Date.now()}.${ext}`;
    await downloadFileBlob(`/admin/reports/${type}/export`, { ...params, format }, defaultFilename);
  },

  // =========================================================================
  // LECTURER REPORTS
  // =========================================================================
  getLecturerReportPreview: async (type, params) => {
    return await api.get(`/lecturer/reports/${type}/preview`, { params });
  },

  downloadLecturerReport: async (type, format, params) => {
    const ext = format === 'PDF' ? 'pdf' : format === 'EXCEL' ? 'xlsx' : 'csv';
    const defaultFilename = `labattend-lecturer-${type.toLowerCase()}-${Date.now()}.${ext}`;
    await downloadFileBlob(`/lecturer/reports/${type}/export`, { ...params, format }, defaultFilename);
  },
};

export default reportService;
