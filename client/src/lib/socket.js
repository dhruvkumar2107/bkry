import { io } from 'socket.io-client';
import { API_BASE } from './api.js';

let socket = null;

export const getSocket = () => {
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
