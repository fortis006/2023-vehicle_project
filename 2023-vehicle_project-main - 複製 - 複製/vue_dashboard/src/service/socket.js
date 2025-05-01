import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://127.0.0.1:5000';

let socket;

const createSocket = () => {
    if (!socket) {
        socket = io(WS_URL, {
            path: '/socket.io',
            autoConnect: false,
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        socket.on('connect', () => {
            console.log('WebSocket connected');
        });

        socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            console.log('Connection URL:', WS_URL);
            console.log('Connection options:', socket.io.opts);
        });

        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }
    return socket;
};

const getSocket = () => {
    if (!socket) {
        return createSocket();
    }
    return socket;
};

const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// 默認導出
export default createSocket();

// 命名導出
export { getSocket, disconnectSocket };