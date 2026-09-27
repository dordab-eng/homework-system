import { io } from 'socket.io-client';
import { getToken } from './api.js';

let socket = null;

export function getSocket() {
  if (!socket) {
    const url = (import.meta.env.VITE_API_URL || '').replace('/api', '') || window.location.origin;
    socket = io(url, { auth: { token: getToken() }, transports: ['websocket'] });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
