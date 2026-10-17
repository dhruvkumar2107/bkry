import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        socket.user = jwt.verify(token, env.jwtSecret);
      } catch {
        socket.user = null;
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const role = socket.user?.role;
    if (role === 'ADMIN') socket.join('admins');
    if (role === 'DELIVERY') socket.join('delivery');
    if (socket.user?.id) socket.join(`user:${socket.user.id}`);

    socket.on('order:subscribe', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on('order:unsubscribe', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });
  });

  return io;
};

export const getIo = () => io;

export const emitToOrder = (orderId, event, payload) => {
  if (io) io.to(`order:${orderId}`).emit(event, payload);
};

export const emitToAdmins = (event, payload) => {
  if (io) io.to('admins').emit(event, payload);
};

export const emitToDelivery = (event, payload) => {
  if (io) io.to('delivery').emit(event, payload);
};

export const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};
