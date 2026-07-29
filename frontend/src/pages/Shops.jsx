import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';

export const Shops = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchShops = async () => {
        setLoading(true);
        try {
            const res = await API.get('/shops/approved');
            setShops(res.data?.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to fetch shops', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    const handleOrderClick = (shopId) => {
        navigate('/place-order', { state: { shopId } });
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading available xerox shops...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Available Xerox Shops</h1>
                <p style={{ color: 'var(--text-secondary)' }}>View print partners, compare pricing, and order directly from them.</p>
            </div>

            {shops.length === 0 ? (
                <div className="empty-state card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '2.5rem' }}>
                    <h3>No Approved Shops Available</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>We currently don't have any xerox shop partners onboarding. Please check back later!</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {shops.map((shop) => (
                        <div key={shop._id} className="card card-hover" style={{
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%',
                            position: 'relative'
                        }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                                        {shop.shopName}
                                    </h3>
                                </div>

                                <p style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '1rem',
                                    lineHeight: '1.4'
                                }}>
                                    {shop.description || 'No description provided.'}
                                </p>

                                {/* Location & Contact Info Section */}
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                        📍 <strong>Address:</strong> {shop.location?.address}
                                        {shop.location?.googleMapsLink && (
                                            <a href={shop.location.googleMapsLink} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                                                View on Maps
                                            </a>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                        📞 <strong>Phone:</strong> <a href={`tel:${shop.phone}`} style={{ color: 'var(--text-primary)' }}>{shop.phone}</a>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        ✉️ <strong>Email:</strong> <a href={`mailto:${shop.email}`} style={{ color: 'var(--text-primary)' }}>{shop.email}</a>
                                    </div>
                                </div>

                                {/* Availability Timing */}
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                        🕒 <strong>Hours:</strong> {shop.openTiming?.open} - {shop.openTiming?.close}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        📅 <strong>Days:</strong> {shop.openDays?.join(', ')}
                                    </div>
                                </div>

                                {/* Pricing grid */}
                                <div style={{
                                    backgroundColor: 'var(--bg-input)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.8rem',
                                    marginBottom: '1rem',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '0.4rem'
                                }}>
                                    <div>🖤 B&W: <strong>₹{shop.pricing?.bwPerPage}/pg</strong></div>
                                    <div>💙 Color: <strong>₹{shop.pricing?.colorPerPage}/pg</strong></div>
                                    <div>🌀 Spiral: <strong>₹{shop.pricing?.spiralBinding}</strong></div>
                                    <div>📕 Book: <strong>₹{shop.pricing?.bookBinding}</strong></div>
                                </div>

                                {/* Tags (COD, Delivery) */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                    {shop.isDeliveryAvailable ? (
                                        <span className="badge badge-approved" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>🚚 Delivery Available</span>
                                    ) : (
                                        <span className="badge badge-pending" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>🏠 Pickup Only</span>
                                    )}

                                    {shop.isCodAvailable ? (
                                        <span className="badge badge-approved" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>💵 COD Available</span>
                                    ) : (
                                        <span className="badge badge-pending" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>💳 Online Only</span>
                                    )}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: 'auto' }}
                                onClick={() => handleOrderClick(shop._id)}
                            >
                                Order from Shop
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Shops;
