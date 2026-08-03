import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import API from '../services/api';
import Modal from '../components/Modal';
import './Dashboard.css';

export const Dashboard = () => {
    const { user, fetchMe } = useAuth();
    const { showToast } = useToast();
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isResignModalOpen, setIsResignModalOpen] = useState(false);
    const [resigning, setResigning] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const ordersRes = await API.get('/orders/me');
                if (ordersRes.data?.data) {
                    setRecentOrders(ordersRes.data.data.slice(0, 3));
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleResign = async () => {
        setResigning(true);
        try {
            await API.post('/auth/resign');
            await fetchMe();
            showToast('You have successfully resigned your role and reverted to User', 'success');
            setIsResignModalOpen(false);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to resign role', 'error');
        } finally {
            setResigning(false);
        }
    };

    return (
        <div className="page-container">
            {/* User Greeting Banner */}
            <div className="dashboard-banner card">
                <div className="banner-info">
                    <h2>Welcome back, {user?.name}!</h2>
                    <p>
                        Role: <strong style={{ textTransform: 'uppercase' }}>{user?.role}</strong> 
                    </p>
                    <p>
                        Account Status: <span className="badge badge-approved">{user?.accountStatus}</span>
                    </p>
                </div>
                <div className="banner-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link to="/place-order" className="btn btn-primary">
                        Place Order
                    </Link>
                    {(user?.role === 'ADMIN' || user?.role === 'SHOP') && (
                        <button
                            className="btn btn-secondary"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => setIsResignModalOpen(true)}
                        >
                            Option to Resign
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Action Cards Grid - Personalized per Role */}
            <div className="actions-grid">
                {/* USER ROLE CARDS */}
                {user?.role === 'USER' && (
                    <>
                        <Link to="/place-order" className="action-card card card-hover">
                            <div className="action-icon">🖨️</div>
                            <h3>Place Orders</h3>
                            <p>Select a shop, upload documents, choose pickup or delivery, and order.</p>
                        </Link>

                        <Link to="/my-orders" className="action-card card card-hover">
                            <div className="action-icon">📋</div>
                            <h3>My Orders</h3>
                            <p>Track current print orders and view complete order history.</p>
                        </Link>

                        {/* <Link to="/apply-shop" className="action-card card card-hover">
                            <div className="action-icon">🏪</div>
                            <h3>Apply for Shop</h3>
                            <p>Submit your shop details & rates to join XeroxDosth network.</p>
                        </Link>

                        <Link to="/apply-admin" className="action-card card card-hover">
                            <div className="action-icon">🛡️</div>
                            <h3>Apply for Admin Role</h3>
                            <p>Submit request and details to obtain platform admin privileges.</p>
                        </Link>

                        <Link to="/application-status" className="action-card card card-hover">
                            <div className="action-icon">📜</div>
                            <h3>Application Status</h3>
                            <p>Check the status of your shop and admin role applications.</p>
                        </Link> */}

                        <Link to="/shops" className="action-card card card-hover">
                            <div className="action-icon">🏬</div>
                            <h3>Shops</h3>
                            <p>View all approved available shops and order from them.</p>
                        </Link>
                    </>
                )}

                {/* SHOP OWNER ROLE CARDS */}
                {user?.role === 'SHOP' && (
                    <>
                        <Link to="/shop-orders" className="action-card card card-hover">
                            <div className="action-icon">📦</div>
                            <h3>Customer Orders</h3>
                            <p>View and manage incoming customer print orders for your shop.</p>
                        </Link>

                        {/* <Link to="/apply-admin" className="action-card card card-hover">
                            <div className="action-icon">🛡️</div>
                            <h3>Apply for Admin</h3>
                            <p>Submit request for platform administrator privileges.</p>
                        </Link>

                        <Link to="/application-status" className="action-card card card-hover">
                            <div className="action-icon">📜</div>
                            <h3>Application Status</h3>
                            <p>View statuses of your role and shop applications.</p>
                        </Link> */}

                        <Link to="/update-shop" className="action-card card card-hover">
                            <div className="action-icon">⚙️</div>
                            <h3>Update Shop Details</h3>
                            <p>Edit shop information, operating hours, address, and pricing rates.</p>
                        </Link>

                        <Link to="/shops" className="action-card card card-hover">
                            <div className="action-icon">🏬</div>
                            <h3>Shops</h3>
                            <p>View all approved available shops and order from them.</p>
                        </Link>
                    </>
                )}

                {/* ADMIN ROLE CARDS */}
                {user?.role === 'ADMIN' && (
                    <>
                        {/* <Link to="/admin/applications" className="action-card card card-hover">
                            <div className="action-icon">🛡️</div>
                            <h3>Admin Applications</h3>
                            <p>Review and approve/reject user requests for ADMIN role.</p>
                        </Link>

                        <Link to="/admin/shops" className="action-card card card-hover">
                            <div className="action-icon">🏪</div>
                            <h3>Shop Applications</h3>
                            <p>Review and onboard pending shop partnering submissions.</p>
                        </Link> */}

                        <Link to="/admin/manage-admins" className="action-card card card-hover">
                            <div className="action-icon">👥</div>
                            <h3>Manage Admins</h3>
                            <p>View platform administrators list and demote privileges if needed.</p>
                        </Link>

                        <Link to="/admin/manage-shops" className="action-card card card-hover">
                            <div className="action-icon">⚙️</div>
                            <h3>Manage Shops</h3>
                            <p>Manage all registered xerox shops and partner statuses.</p>
                        </Link>

                        <Link to="/shops" className="action-card card card-hover">
                            <div className="action-icon">🏬</div>
                            <h3>Shops</h3>
                            <p>View all approved available shops and order from them.</p>
                        </Link>
                    </>
                )}
            </div>

            {/* Dashboard Stats & Overview */}
            <div className="dashboard-content-grid">
                <div className="overview-section card" style={{ gridColumn: '1 / -1' }}>
                    <div className="section-header">
                        <h3>Recent Print Orders</h3>
                        <Link to="/my-orders" className="view-all-link">View All ({recentOrders.length})</Link>
                    </div>

                    {loading ? (
                        <div className="page-loading" style={{ minHeight: '150px' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : recentOrders.length > 0 ? (
                        <div className="recent-orders-list">
                            {recentOrders.map((order) => (
                                <div key={order._id} className="recent-order-item">
                                    <div className="order-item-main">
                                        <span className="order-shop">{order.shop?.shopName || 'Print Shop'}</span>
                                        <span className="order-pages">{order.totalPages} pages ({order.copies} copies)</span>
                                    </div>
                                    <div className="order-item-status">
                                        <span className={`badge badge-${order.status.toLowerCase()}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>You haven't placed any orders yet.</p>
                            <Link to="/place-order" className="btn btn-secondary btn-sm">Place First Order</Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Resign Role Modal */}
            <Modal
                isOpen={isResignModalOpen}
                onClose={() => setIsResignModalOpen(false)}
                title={`Resign ${user?.role} Role`}
            >
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    Are you sure you want to resign from your <strong>{user?.role}</strong> role? This will revert your account to a standard User.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setIsResignModalOpen(false)}>
                        Cancel
                    </button>
                    <button className="btn btn-danger" onClick={handleResign} disabled={resigning}>
                        {resigning ? <div className="spinner"></div> : 'Confirm Resignation'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;

