import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('labattend_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Uniform error extraction and 401 handling
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginEndpoint) {
      // Clear expired credentials and notify auth flow
      localStorage.removeItem('labattend_token');
      localStorage.removeItem('labattend_user');
      
      // Dispatch custom event for AuthContext to sync
      window.dispatchEvent(new Event('labattend:unauthorized'));
    }

    const errorData = error.response?.data || {
      message: error.message || 'An unexpected network error occurred',
      status: status || 500,
    };
    return Promise.reject(errorData);
  }
);

export default api;
