import axios from 'axios';
import { auth } from '@/contexts/AuthContext';
import { API_URL } from '@/config/api';

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(
  async (config) => {
    // Ensure Firebase Auth is initialized and ready
    await auth.authStateReady();
    
    const user = auth.currentUser;
    if (user) {
      // Force refreshing token only if necessary, otherwise use cached
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
