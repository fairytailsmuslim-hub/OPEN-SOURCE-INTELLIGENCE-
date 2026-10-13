import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // HttpOnly cookie bhejne ke liye
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    if (err.response?.status === 403 &&
        err.response?.data?.error === 'REGION_RESTRICTED') {
      // UI mein banner dikhao
      window.dispatchEvent(new CustomEvent('region-restricted'));
    }
    return Promise.reject(err);
  }
);

export default api;