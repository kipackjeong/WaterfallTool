import axios, { AxiosRequestConfig } from 'axios';
import { toastEvents } from '../helpers/toastEvents';

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
const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor to extract data.data for convenience
apiClient.interceptors.response.use(
    (res) => {
        console.log(`[apiClient] Response from ${res.config.method?.toUpperCase()} ${res.config.url}:`, res);
        return res.data;
    },
    (err) => {
        console.error(`[apiClient] Error:`, err);
        const errMsg = err.response?.data?.message && JSON.stringify(err.response?.data.message) || 'An error occurred';
        toastEvents.emit(errMsg, 'error');
        return null;
    }
);

export default apiClient;
