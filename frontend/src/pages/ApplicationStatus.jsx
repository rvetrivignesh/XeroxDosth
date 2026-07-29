import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { useToast } from '../context/ToastContext';

export const ApplicationStatus = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [shopApp, setShopApp] = useState(null);
    const [roleApps, setRoleApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const [shopRes, roleRes] = await Promise.allSettled([
                API.get('/shops/me'),
                API.get('/applications/me')
            ]);

            if (shopRes.status === 'fulfilled' && shopRes.value.data?.data) {
                setShopApp(shopRes.value.data.data);
            } else {
                setShopApp(null);
            }

            if (roleRes.status === 'fulfilled' && roleRes.value.data?.data) {
                setRoleApps(roleRes.value.data.data);
            } else {
                setRoleApps([]);
            }
        } catch (err) {
            setError(err.message || 'Failed to load application status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllApplications();
    }, []);

    const handleWithdrawRoleApp = async (appId) => {
        if (!window.confirm('Are you sure you want to withdraw this application?')) return;
        try {
            await API.delete(`/applications/${appId}`);
            showToast('Application withdrawn successfully', 'info');
            fetchAllApplications();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to withdraw application', 'error');
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading application statuses...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>Error Loading Status</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    const hasNoApplications = !shopApp && roleApps.length === 0;

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Application Status</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Track your submissions for Shop Partnering and Admin Role requests.</p>
            </div>

            {hasNoApplications ? (
                <div className="empty-state card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '2.5rem' }}>
                    <h3>No Active Applications</h3>
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>You haven't submitted any shop partnering or admin role applications yet.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {user?.role === 'USER' && (
                            <Link to="/apply-shop" className="btn btn-primary">
                                Apply for Shop
                            </Link>
                        )}
                        {(user?.role === 'USER' || user?.role === 'SHOP') && (
                            <Link to="/apply-admin" className="btn btn-secondary">
                                Apply for Admin Role
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Role Applications Section */}
                    {roleApps.length > 0 && (
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🛡️ Admin & Role Applications
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {roleApps.map((app) => (
                                    <div key={app._id} className="card" style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                                                    Requested Role: <span className="badge role-badge">{app.requestedRole}</span>
                                                </h4>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    Submitted on {new Date(app.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className={`badge badge-${app.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                                                    {app.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                            <div>
                                                <small style={{ color: 'var(--text-muted)' }}>Contact Email</small>
                                                <div style={{ fontWeight: 500 }}>{app.email}</div>
                                            </div>
                                            <div>
                                                <small style={{ color: 'var(--text-muted)' }}>Phone</small>
                                                <div style={{ fontWeight: 500 }}>{app.phone}</div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '0.75rem' }}>
                                            <small style={{ color: 'var(--text-muted)' }}>Reason / Description</small>
                                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{app.description}</p>
                                        </div>

                                        {app.rejectionReason && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-danger, #ef4444)' }}>
                                                <strong style={{ color: '#ef4444', fontSize: '0.85rem' }}>Rejection Reason: </strong>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{app.rejectionReason}</span>
                                            </div>
                                        )}

                                        {app.status === 'PENDING' && (
                                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ color: '#ef4444' }}
                                                    onClick={() => handleWithdrawRoleApp(app._id)}
                                                >
                                                    Withdraw Application
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shop Application Section */}
                    {shopApp && (
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🏪 Shop Partnering Application
                            </h3>
                            <div className="card" style={{ padding: '1.5rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingBottom: '1rem',
                                    marginBottom: '1rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>{shopApp.shopName}</h3>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {shopApp._id}</span>
                                    </div>

                                    <div>
                                        <span className={`badge badge-${shopApp.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                                            {shopApp.status}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <small style={{ color: 'var(--text-muted)' }}>Email</small>
                                        <div style={{ fontWeight: 500 }}>{shopApp.email}</div>
                                    </div>
                                    <div>
                                        <small style={{ color: 'var(--text-muted)' }}>Phone</small>
                                        <div style={{ fontWeight: 500 }}>{shopApp.phone}</div>
                                    </div>
                                    <div>
                                        <small style={{ color: 'var(--text-muted)' }}>Open Hours</small>
                                        <div style={{ fontWeight: 500 }}>{shopApp.openTiming?.open} - {shopApp.openTiming?.close}</div>
                                    </div>
                                    <div>
                                        <small style={{ color: 'var(--text-muted)' }}>Submitted On</small>
                                        <div style={{ fontWeight: 500 }}>{new Date(shopApp.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                {/* Pricing summary */}
                                {shopApp.pricing && (
                                    <div style={{ marginBottom: '1rem', padding: '0.85rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Configured Rates (₹)</h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                                            <div>B&W Page: <strong>₹{shopApp.pricing.bwPerPage}</strong></div>
                                            <div>Color Page: <strong>₹{shopApp.pricing.colorPerPage}</strong></div>
                                            <div>Spiral Binding: <strong>₹{shopApp.pricing.spiralBinding}</strong></div>
                                            <div>Book Binding: <strong>₹{shopApp.pricing.bookBinding}</strong></div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginBottom: '1rem' }}>
                                    <small style={{ color: 'var(--text-muted)' }}>Address</small>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{shopApp.location?.address}</div>
                                </div>

                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Open Days</small>
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                        {shopApp.openDays?.map((day) => (
                                            <span key={day} className="badge badge-accepted" style={{ fontSize: '0.75rem' }}>
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApplicationStatus;
