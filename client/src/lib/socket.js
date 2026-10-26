import { io } from 'socket.io-client';
import { API_BASE } from './api.js';

// Realtime sockets connect to the server (Socket.IO) for live order tracking,
// live delivery GPS, and status updates. Enabled by default.
const ENABLED = import.meta.env.VITE_ENABLE_SOCKETS !== 'false';

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
