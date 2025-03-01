import axios, { AxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  async get(endpoint: string, config?: AxiosRequestConfig<any>) {
    console.log('[apiService] GET', endpoint, config)
    try {
      const res = await apiClient.get(endpoint, config);
      return res.data.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  async post(endpoint: string, data: Record<string, any>, config?: AxiosRequestConfig<any>) {
    console.log('[apiService] POST', endpoint, data)
    try {
      const res = await apiClient.post(endpoint, data);
      return res.data.data;
    } catch (error) {
      console.error(`Error adding ${endpoint}:`, error);
      throw error;
    }
  },

  async put(endpoint: string, updateData: Record<string, any>, config?: AxiosRequestConfig<any>) {
    console.log('[apiService] PUT', endpoint, updateData)
    try {
      const res = await apiClient.put(endpoint, updateData);
      return res.data.data;
    } catch (error) {
      console.error(`Error updating ${endpoint}:`, error);
      throw error;
    }
  },

  async delete(endpoint: string, config?: AxiosRequestConfig<any>) {
    console.log('[apiService] DELETE', endpoint)
    try {
      const res = await apiClient.delete(endpoint, config);
      return res.data.data;
    } catch (error) {
      console.error(`Error deleting ${endpoint}:`, error);
      throw error;
    }
  },
};
