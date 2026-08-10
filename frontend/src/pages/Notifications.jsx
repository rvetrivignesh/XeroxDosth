import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import io from 'socket.io-client';
import API from '../services/api';

export const Notifications = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await API.get('/notifications');
            setNotifications(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
            showToast('Failed to load notifications', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        // Connect to socket.io
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace('/api', '');
        const socket = io(socketUrl, { transports: ['websocket'] });

        socket.on('connect', () => {
            socket.emit('join', user._id);
        });

        socket.on('notification', (newNotif) => {
            setNotifications((prev) => [newNotif, ...prev]);
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const handleMarkAllRead = async () => {
        try {
            await API.patch('/notifications/read-all');
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            showToast('All notifications marked as read', 'success');
        } catch (err) {
            showToast('Failed to mark notifications as read', 'error');
        }
    };

    const handleNotifClick = async (notif) => {
        try {
            if (!notif.isRead) {
                await API.patch(`/notifications/${notif._id}/read`);
                setNotifications((prev) =>
                    prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
                );
            }

            // Redirect based on role and type
            if (user.role === 'SHOP') {
                navigate('/shop-orders');
            } else {
                if (notif.type === 'PAYMENT_REQUESTED') {
                    navigate(`/payment-request/${notif.order}`);
                } else {
                    navigate('/my-orders');
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <div className="page-container" style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}
            >
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Notifications
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                        {unreadCount > 0
                            ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                            : 'All caught up! No unread notifications'}
                    </p>
                </div>

                {unreadCount > 0 && (
                    <button
                        className="btn btn-secondary"
                        onClick={handleMarkAllRead}
                        style={{
                            fontSize: '0.85rem',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading notifications...
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Notifications Yet</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto' }}>
                            We'll let you know when there are updates on your orders or account.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {notifications.map((notif) => (
                            <div
                                key={notif._id}
                                onClick={() => handleNotifClick(notif)}
                                style={{
                                    padding: '1.25rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    backgroundColor: notif.isRead ? 'transparent' : 'var(--bg-input)',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '1rem'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = notif.isRead ? 'transparent' : 'var(--bg-input)')}
                            >
                                <div
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: notif.isRead ? 'transparent' : 'var(--accent-color)',
                                        marginTop: '0.5rem',
                                        flexShrink: 0
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontWeight: notif.isRead ? 500 : 700,
                                            color: 'var(--text-primary)',
                                            fontSize: '0.95rem',
                                            lineHeight: 1.3
                                        }}
                                    >
                                        {notif.title}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem', lineHeight: 1.4 }}>
                                        {notif.message}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                        {new Date(notif.createdAt).toLocaleDateString(undefined, {
                                            dateStyle: 'medium'
                                        })}{' '}
                                        at{' '}
                                        {new Date(notif.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
