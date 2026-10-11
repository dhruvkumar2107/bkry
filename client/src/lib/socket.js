import { io } from 'socket.io-client';
import { API_BASE } from './api.js';

// Realtime sockets require a long-lived server (Socket.IO). On serverless hosts
// such as Vercel they are unavailable, so they are opt-in via
// VITE_ENABLE_SOCKETS=true. When disabled a no-op stub is returned and the UI
// falls back to periodic polling of the REST API.
const ENABLED = import.meta.env.VITE_ENABLE_SOCKETS === 'true';

let socket = null;

const noopSocket = {
  on() { return this; },
  off() { return this; },
  emit() { return this; },
  disconnect() {},
};

export const getSocket = () => {
  if (!ENABLED) return noopSocket;
  if (!socket) {
    socket = io(API_BASE || window.location.origin, {
      auth: { token: localStorage.getItem('chotulal_token') },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket();
};
