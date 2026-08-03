import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from './ThemeToggle';
import Modal from './Modal';
import './Navbar.css';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);
    const closeMenu = () => setIsMenuOpen(false);

    const handleLogoutConfirm = async () => {
        setIsLogoutModalOpen(false);
        closeMenu();
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
                                        <Link to="/admin/applications" className="mobile-link" onClick={closeMenu}>Admin Applications</Link>
                                        <Link to="/admin/shops" className="mobile-link" onClick={closeMenu}>Shop Applications</Link>
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

