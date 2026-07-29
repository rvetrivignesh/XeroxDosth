import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';

export const AdminShops = () => {
    const { showToast } = useToast();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectionMap, setRejectionMap] = useState({});
    const [actionId, setActionId] = useState(null);

    const fetchShops = async () => {
        setLoading(true);
        try {
            const res = await API.get('/shops/admin/all');
            setShops(res.data?.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load shops', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    const handleUpdateStatus = async (id, status) => {
        const rejectionReason = rejectionMap[id] || '';
        if (status === 'REJECTED' && !rejectionReason.trim()) {
            showToast('Please enter a rejection reason', 'error');
            return;
        }

        setActionId(id);
        try {
            await API.patch(`/shops/admin/${id}/status`, { status, rejectionReason });
            showToast(`Shop status updated to ${status}`, 'success');
            fetchShops();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update shop status', 'error');
        } finally {
            setActionId(null);
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading shop applications...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Shop Partnering Applications</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Review pending shop submissions and manage active xerox partners.</p>
            </div>

            {shops.length === 0 ? (
                <div className="empty-state card">
                    <h3>No Shop Applications Found</h3>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {shops.map((shop) => (
                        <div key={shop._id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                                        {shop.shopName}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Owner: {shop.owner?.name} ({shop.owner?.email})
                                    </span>
                                </div>
                                <span className={`badge badge-${shop.status.toLowerCase()}`} style={{ fontSize: '0.85rem' }}>
                                    {shop.status}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Email & Phone</small>
                                    <div>{shop.email} | {shop.phone}</div>
                                </div>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Open Timing</small>
                                    <div>{shop.openTiming?.open} - {shop.openTiming?.close}</div>
                                </div>
                            </div>

                            {shop.pricing && (
                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                    <strong>Configured Pricing: </strong> B&W ₹{shop.pricing.bwPerPage} | Color ₹{shop.pricing.colorPerPage} | Spiral ₹{shop.pricing.spiralBinding} | Book ₹{shop.pricing.bookBinding}
                                </div>
                            )}

                            <div style={{ marginBottom: '0.75rem' }}>
                                <small style={{ color: 'var(--text-muted)' }}>Address</small>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{shop.location?.address}</div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                {shop.status !== 'APPROVED' && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleUpdateStatus(shop._id, 'APPROVED')}
                                        disabled={actionId === shop._id}
                                    >
                                        Approve Shop
                                    </button>
                                )}

                                {shop.status !== 'REJECTED' && (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="Rejection reason..."
                                            value={rejectionMap[shop._id] || ''}
                                            onChange={(e) => setRejectionMap({ ...rejectionMap, [shop._id]: e.target.value })}
                                            style={{ flex: 1, minWidth: '180px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                                        />
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleUpdateStatus(shop._id, 'REJECTED')}
                                            disabled={actionId === shop._id}
                                        >
                                            Reject / Disable
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminShops;
