import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { getAccessToken } from './client';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    const token = getAccessToken();
    socketInstance = io(SOCKET_URL, { 
      withCredentials: true,
      auth: { token }
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
