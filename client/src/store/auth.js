import { create } from 'zustand';
import api from '../lib/api.js';
import { reconnectSocket } from '../lib/socket.js';

export const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem('chotulal_token') || null,
  loading: false,
  ready: false,

  setSession: (token, user) => {
    localStorage.setItem('chotulal_token', token);
    reconnectSocket();
    set({ token, user, ready: true });
  },

  loadMe: async () => {
    const token = localStorage.getItem('chotulal_token');
    if (!token) return set({ ready: true, user: null });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, ready: true });
    } catch {
      localStorage.removeItem('chotulal_token');
      set({ token: null, user: null, ready: true });
    }
  },

  requestOtp: async (phone) => {
    const { data } = await api.post('/auth/request-otp', { phone });
    return data;
  },

  verifyOtp: async (phone, code, name) => {
    const { data } = await api.post('/auth/verify-otp', { phone, code, name });
    get().setSession(data.token, data.user);
    return data.user;
  },

  staffLogin: async (identifier, password, role) => {
    const { data } = await api.post('/auth/login', { identifier, password, role });
    get().setSession(data.token, data.user);
    return data.user;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('chotulal_token');
    reconnectSocket();
    set({ token: null, user: null });
  },

  updateProfile: async (patch) => {
    const { data } = await api.patch('/auth/profile', patch);
    set({ user: { ...get().user, ...data.user } });
    return data.user;
  },
}));
