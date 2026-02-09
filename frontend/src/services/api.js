import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// if we get a 401, send user to login page
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
