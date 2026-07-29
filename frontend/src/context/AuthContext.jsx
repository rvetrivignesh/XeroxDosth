import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const updateUserState = (userData) => {
        if (userData) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        } else {
            setUser(null);
            localStorage.removeItem('user');
        }
    };

    const fetchMe = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            updateUserState(null);
            setLoading(false);
            return;
        }

        try {
            const res = await API.get('/auth/me');
            const userData = res.data?.data?.user || res.data?.data;
            if (userData && (userData._id || userData.id)) {
                updateUserState(userData);
            } else {
                updateUserState(null);
                localStorage.removeItem('token');
            }
        } catch {
            localStorage.removeItem('token');
            updateUserState(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMe();
    }, []);

    const login = async (email, password) => {
        const res = await API.post('/auth/login', { email, password });
        const data = res.data?.data;
        if (data && data.token) {
            localStorage.setItem('token', data.token);
        }
        if (data && data.user) {
            updateUserState(data.user);
        } else {
            await fetchMe();
        }
        return res.data;
    };

    const register = async (name, email, password) => {
        const res = await API.post('/auth/register', { name, email, password });
        const data = res.data?.data;
        if (data && data.token) {
            localStorage.setItem('token', data.token);
        }
        if (data && data.user) {
            updateUserState(data.user);
        } else {
            await fetchMe();
        }
        return res.data;
    };

    const logout = async () => {
        try {
            await API.post('/auth/logout');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('token');
            updateUserState(null);
        }
    };

    const loginWithGoogle = async (idToken) => {
        const res = await API.post('/auth/google', { idToken });
        const data = res.data?.data;
        if (data && data.token) {
            localStorage.setItem('token', data.token);
        }
        if (data && data.user) {
            updateUserState(data.user);
        } else {
            await fetchMe();
        }
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithGoogle, fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
};


export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
