import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create enhanced API client with better configuration
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true, // Include cookies in cross-origin requests if needed
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    // You can add authorization headers here if needed
    // const token = localStorage.getItem('auth_token');
    // if (token) {
    //   config.headers['Authorization'] = `Bearer ${token}`;
    // }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    return config;
  },
  (err: AxiosError) => {
    console.error('[API Request Error]', err);
    return Promise.reject(err);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (res: AxiosResponse) => {
    console.log(`[API Response] ${res.config.method?.toUpperCase()} ${res.config.url}`, res.status);
    // Assuming your API returns data in a nested 'data' property
    // This unwraps it for easier consumption
    return res.data?.data !== undefined ? { ...res, data: res.data.data } : res;
  },
  (err: AxiosError) => {
    const status = err.response?.status;
    const method = err.config?.method?.toUpperCase();
    const url = err.config?.url;
    
    console.error(`[API Error] ${method} ${url} - Status: ${status}`, err.response?.data || err.message);
    
    // Add custom error handling here if needed
    // For example: if (status === 401) { /* handle unauthorized */ }
    
    return Promise.reject(err);
  }
);

export default apiClient;
