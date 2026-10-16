import { io } from 'socket.io-client';

export const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export default socket;