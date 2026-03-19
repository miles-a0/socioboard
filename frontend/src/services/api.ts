import axios from 'axios';

// Create an Axios instance pointing to the FastAPI backend
const apiUrl = '/api';

const api = axios.create({
  baseURL: apiUrl, // Automatically adapts to Ngrok proxy or Localhost
});

// Request interceptor to attach JWT token to headers if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
