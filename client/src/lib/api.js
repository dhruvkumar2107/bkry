import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || '';

const api = axios.create({ baseURL: `${API_BASE}/api`, withCredentials: true });

// Attach bearer token + guest cart token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chotulal_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const guest = localStorage.getItem('chotulal_guest');
  if (guest) config.headers['x-guest-token'] = guest;
  return config;
});

if (!localStorage.getItem('chotulal_guest')) {
  localStorage.setItem('chotulal_guest', Math.random().toString(36).slice(2) + Date.now().toString(36));
}

export const apiError = (err) => {
  const data = err?.response?.data;
  if (data?.details?.length) return data.details.map((d) => d.message).join(', ');
  return data?.error || err?.message || 'Something went wrong';
};

export default api;
