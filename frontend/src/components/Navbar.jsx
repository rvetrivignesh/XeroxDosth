import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from './ThemeToggle';
import Modal from './Modal';
import io from 'socket.io-client';
import API from '../services/api';
import './Navbar.css';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const toggleNotifDropdown = () => {
        if (window.innerWidth < 768) {
            setIsNotifOpen(false);
            navigate('/notifications');
        } else {
            setIsNotifOpen((prev) => !prev);
        }
        if (isMenuOpen) closeMenu();
    };

    const fetchNotifications = async () => {
        try {
            const res = await API.get('/notifications');
            setNotifications(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    };

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        fetchNotifications();

        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace('/api', '');
        const socket = io(socketUrl, { transports: ['websocket'] });

        socket.on('connect', () => {
            console.log('🔌 Connected to Socket.IO notification channel');
            socket.emit('join', user._id);
        });

        socket.on('notification', (newNotif) => {
            console.log('🔔 Received live notification:', newNotif);
            setNotifications((prev) => [newNotif, ...prev]);
            showToast(newNotif.title, 'info');
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
            setIsNotifOpen(false);

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

    const toggleMenu = () => {
        setIsMenuOpen((prev) => !prev);
        if (isNotifOpen) setIsNotifOpen(false);
    };

    const closeMenu = () => setIsMenuOpen(false);

    const handleLogoutConfirm = async () => {
        setIsLogoutModalOpen(false);
        closeMenu();
        setIsNotifOpen(false);
        await logout();
        showToast('Logged out successfully', 'info');
        navigate('/login');
    };

    return (
        <>
            <header className="navbar-header">
                <nav className="navbar-container">
                    <Link to={user ? "/dashboard" : "/"} className="navbar-brand" onClick={closeMenu}>
                        <svg className="brand-logo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>XeroxDosth</span>
                    </Link>

                    {/* Right Header Actions: Theme Toggle & Hamburger Button ONLY */}
                    <div className="nav-actions">
                        <ThemeToggle />

                        {user && (
                            <div className="notif-wrapper" style={{ position: 'relative' }}>
                                <button
                                    className="notif-bell-btn"
                                    onClick={toggleNotifDropdown}
                                    aria-label="Notifications"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '1.25rem',
                                        cursor: 'pointer',
                                        padding: '0.35rem',
                                        borderRadius: 'var(--radius-sm)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    🔔
                                    {notifications.filter((n) => !n.isRead).length > 0 && (
                                        <span
                                            className="notif-badge"
                                            style={{
                                                position: 'absolute',
                                                top: '-2px',
                                                right: '-2px',
                                                backgroundColor: 'var(--error-text, #ef4444)',
                                                color: 'white',
                                                fontSize: '0.65rem',
                                                padding: '2px 5px',
                                                borderRadius: '10px',
                                                fontWeight: 'bold',
                                                lineHeight: 1
                                            }}
                                        >
                                            {notifications.filter((n) => !n.isRead).length}
                                        </span>
                                    )}
                                </button>

                                {isNotifOpen && (
                                    <div
                                        className="notif-dropdown card"
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '0.5rem',
                                            width: '320px',
                                            maxHeight: '400px',
                                            zIndex: 1080,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            boxShadow: 'var(--shadow-lg)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderBottom: '1px solid var(--border-color)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                backgroundColor: 'var(--bg-hover)'
                                            }}
                                        >
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                                                Notifications
                                            </h4>
                                            {notifications.filter((n) => !n.isRead).length > 0 && (
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--accent-color)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        padding: 0
                                                    }}
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                overflowY: 'auto',
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            {notifications.length === 0 ? (
                                                <div
                                                    style={{
                                                        padding: '2rem',
                                                        textAlign: 'center',
                                                        color: 'var(--text-muted)',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    No notifications yet
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div
                                                        key={notif._id}
                                                        onClick={() => handleNotifClick(notif)}
                                                        style={{
                                                            padding: '0.75rem 1rem',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            cursor: 'pointer',
                                                            backgroundColor: notif.isRead ? 'transparent' : 'var(--bg-input)',
                                                            transition: 'background-color 0.2s',
                                                            fontSize: '0.825rem'
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = notif.isRead ? 'transparent' : 'var(--bg-input)')}
                                                    >
                                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
                                                            {!notif.isRead && (
                                                                <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--accent-color)', borderRadius: '50%' }}></span>
                                                            )}
                                                            {notif.title}
                                                        </div>
                                                        <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                                                            {notif.message}
                                                        </div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                                                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <Link
                                                to="/notifications"
                                                onClick={() => setIsNotifOpen(false)}
                                                style={{
                                                    display: 'block',
                                                    padding: '0.75rem 1rem',
                                                    textAlign: 'center',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    color: 'var(--accent-color)',
                                                    borderTop: '1px solid var(--border-color)',
                                                    backgroundColor: 'var(--bg-hover)',
                                                    textDecoration: 'none',
                                                    transition: 'color var(--transition-fast)'
                                                }}
                                            >
                                                View all notifications
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hamburger button shown on all screens, hidden when menu is open to avoid duplicate close buttons */}
                        {!isMenuOpen && (
                            <button
                                className="hamburger-btn"
                                onClick={toggleMenu}
                                aria-label="Open navigation menu"
                            >
                                <span className="hamburger-bar"></span>
                                <span className="hamburger-bar"></span>
                                <span className="hamburger-bar"></span>
                            </button>
                        )}
                    </div>
                </nav>

                {/* Mobile/Global Side Laydown Overlay Backdrop */}
                <div
                    className={`mobile-overlay ${isMenuOpen ? 'open' : ''}`}
                    onClick={closeMenu}
                    aria-hidden="true"
                ></div>

                {/* Side Laydown Drawer Menu */}
                <aside className={`mobile-drawer ${isMenuOpen ? 'open' : ''}`}>
                    <div className="mobile-drawer-header">
                        <div className="mobile-drawer-brand">
                            <svg className="brand-logo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Menu</span>
                        </div>
                        <button
                            className="mobile-drawer-close"
                            onClick={closeMenu}
                            aria-label="Close menu"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="mobile-links">
                        {user ? (
                            <>
                                <div className="drawer-user-info">
                                    <span className="user-greeting">Hi, {user.name}</span>
                                    <span className="badge role-badge">{user.role}</span>
                                </div>
                                <Link to="/dashboard" className="mobile-link" onClick={closeMenu}>Dashboard</Link>
                                <Link to="/notifications" className="mobile-link" onClick={closeMenu}>Notifications</Link>
                                
                                {/* Common / Role-specific links */}
                                <Link to="/place-order" className="mobile-link" onClick={closeMenu}>Place Order</Link>
                                <Link to="/my-orders" className="mobile-link" onClick={closeMenu}>My Orders</Link>
                                <Link to="/shops" className="mobile-link" onClick={closeMenu}>Shops</Link>
                                
                                {/* {user.role === 'USER' && (
                                    <Link to="/apply-shop" className="mobile-link" onClick={closeMenu}>Apply for Shop</Link>
                                )}
                                {(user.role === 'USER' || user.role === 'SHOP') && (
                                    <Link to="/apply-admin" className="mobile-link" onClick={closeMenu}>Apply for Admin Role</Link>
                                )}
                                <Link to="/application-status" className="mobile-link" onClick={closeMenu}>Application Status</Link> */}

                                {user.role === 'SHOP' && (
                                    <>
                                        <Link to="/shop-orders" className="mobile-link" onClick={closeMenu}>Shop Orders</Link>
                                        <Link to="/update-shop" className="mobile-link" onClick={closeMenu}>Update Shop Details</Link>
                                    </>
                                )}

                                {user.role === 'ADMIN' && (
                                    <>
                                        {/* <Link to="/admin/applications" className="mobile-link" onClick={closeMenu}>Admin Applications</Link>
                                        <Link to="/admin/shops" className="mobile-link" onClick={closeMenu}>Shop Applications</Link> */}
                                        <Link to="/admin/manage-admins" className="mobile-link" onClick={closeMenu}>Manage Admins</Link>
                                        <Link to="/admin/manage-shops" className="mobile-link" onClick={closeMenu}>Manage Shops</Link>
                                    </>
                                )}

                                <Link to="/profile" className="mobile-link" onClick={closeMenu}>Profile</Link>
                                
                                <button
                                    className="btn btn-danger mobile-logout-btn"
                                    onClick={() => {
                                        closeMenu();
                                        setIsLogoutModalOpen(true);
                                    }}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <div className="mobile-auth-btns">
                                <Link to="/login" className="btn btn-secondary" onClick={closeMenu}>Login</Link>
                                <Link to="/register" className="btn btn-primary" onClick={closeMenu}>Register</Link>
                            </div>
                        )}
                    </div>
                </aside>
            </header>

            {/* Logout Confirmation Modal */}
            <Modal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                title="Confirm Logout"
            >
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    Are you sure you want to log out of your XeroxDosth account?
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setIsLogoutModalOpen(false)}>
                        Cancel
                    </button>
                    <button className="btn btn-danger" onClick={handleLogoutConfirm}>
                        Yes, Logout
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default Navbar;

