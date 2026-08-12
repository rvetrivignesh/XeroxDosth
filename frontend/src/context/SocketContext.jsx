import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace('/api', '');
        
        // Enforce websocket-only transport to prevent polling logs and server stress
        const newSocket = io(socketUrl, {
            transports: ['websocket'],
            upgrade: false
        });

        newSocket.on('connect', () => {
            newSocket.emit('join', userId);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user?._id || user?.id]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};
