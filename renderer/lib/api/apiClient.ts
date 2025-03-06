import axios, { AxiosRequestConfig } from 'axios';
import { toastEvents } from '../utils/toastEvents';

/**
 * Axios instance for making API requests
 * 
 * Usage examples:
 * 
 * GET request:
 * const response = await apiClient.get('/endpoint', config);
 * const data = response.data.data;
 * 
 * POST request:
 * const response = await apiClient.post('/endpoint', payload);
 * const data = response.data.data;
 * 
 * PUT request:
 * const response = await apiClient.put('/endpoint', updateData);
 * const data = response.data.data;
 * 
 * DELETE request:
 * const response = await apiClient.delete('/endpoint');
 * const data = response.data.data;
 */

// Log platform information for debugging
if (typeof navigator !== 'undefined') {
    console.log('User Agent:', navigator.userAgent);
}

console.log('Window has electronAPI?', typeof window !== 'undefined' && !!window.electronAPI);

// Create the axios instance for browser environment
const axiosInstance = axios.create({
    baseURL: 'http://localhost:3001',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor to extract data.data for convenience
axiosInstance.interceptors.response.use(
    (res) => {
        console.log(`[apiClient] Response from ${res.config.method?.toUpperCase()} ${res.config.url}:`, res);
        return res.data.data;
    },
    (err) => {
        console.error(`[apiClient] Error:`, err);
        const errMsg = err.response?.data?.message && JSON.stringify(err.response?.data.message) || 'An error occurred';
        toastEvents.emit(errMsg, 'error');
        return Promise.reject(err);
    }
);

// Create a unified API client that works in both browser and Electron
const apiClient = {
    get: async (url: string, config?: AxiosRequestConfig): Promise<any> => {
        console.log(`[apiClient] Request GET ${url}`);
        return axiosInstance.get(url, config);
    },

    post: async (url: string, data?: any, config?: AxiosRequestConfig): Promise<any> => {
        console.log(`[apiClient] Request POST ${url}`);
        return axiosInstance.post(url, data, config);
    },

    put: async (url: string, data?: any, config?: AxiosRequestConfig): Promise<any> => {
        console.log(`[apiClient] Request PUT ${url}`);
        return axiosInstance.put(url, data, config);
    },

    delete: async (url: string, config?: AxiosRequestConfig): Promise<any> => {
        console.log(`[apiClient] Request DELETE ${url}`);
        return axiosInstance.delete(url, config);
    },
};

export default apiClient;
