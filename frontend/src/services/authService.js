import apiClient from './apiClient';

// All auth API calls in one place
export const authService = {
  login:   (email, password) => apiClient.post('/auth/login', { email, password }),
  logout:  ()                => apiClient.post('/auth/logout'),
  me:      ()                => apiClient.get('/auth/me'),
};

export default authService;
