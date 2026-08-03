import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

export const Shops = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShop, setSelectedShop] = useState(null);

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
                                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                                    {shop.shopName}
                                </h3>

                                <p style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '1rem',
                                    lineHeight: '1.4'
                                }}>
                                    {shop.description || 'No description provided.'}
                                </p>

                                {/* Basic Cost */}
                                <div style={{
                                    backgroundColor: 'var(--bg-input)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.85rem',
                                    marginBottom: '1.25rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div>🖤 B&W: <strong>₹{shop.printingRates?.bwSingle ?? shop.pricing?.bwPerPage}/pg</strong></div>
                                    <div>❤️ Color: <strong>₹{shop.printingRates?.colourSingle ?? shop.pricing?.colorPerPage}/pg</strong></div>
                                </div>
                            </div>

                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', marginTop: 'auto' }}
                                onClick={() => setSelectedShop(shop)}
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Details Modal */}
            <Modal
                isOpen={!!selectedShop}
                onClose={() => setSelectedShop(null)}
                title={selectedShop?.shopName || "Shop Details"}
            >
                {selectedShop && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', color: 'var(--text-primary)' }}>
                        <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Description</strong>
                            <p style={{ marginTop: '0.25rem', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                {selectedShop.description || 'No description provided.'}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>📍 Address</strong>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    {selectedShop.location?.address}
                                    {selectedShop.location?.googleMapsLink && (
                                        <a
                                            href={selectedShop.location.googleMapsLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--accent-color)' }}
                                        >
                                            View on Google Maps
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>🕒 Operating Hours</strong>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    <div>{selectedShop.openTiming?.open} - {selectedShop.openTiming?.close}</div>
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Days: {selectedShop.openDays?.join(', ')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>📞 Phone</strong>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>
                                    <a href={`tel:${selectedShop.phone}`} style={{ color: 'var(--text-primary)' }}>{selectedShop.phone}</a>
                                </div>
                            </div>
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>✉️ Email</strong>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>
                                    <a href={`mailto:${selectedShop.email}`} style={{ color: 'var(--text-primary)' }}>{selectedShop.email}</a>
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <strong style={{ fontSize: '0.95rem' }}>Printing Rates (₹)</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>🖤 Black & White</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Single Side:</span>
                                        <strong>₹{selectedShop.printingRates?.bwSingle ?? selectedShop.pricing?.bwPerPage}/pg</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                                        <span>Double Side:</span>
                                        <strong>₹{selectedShop.printingRates?.bwDouble ?? selectedShop.pricing?.bwPerPage}/pg</strong>
                                    </div>
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>❤️ Colour</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Single Side:</span>
                                        <strong>₹{selectedShop.printingRates?.colourSingle ?? selectedShop.pricing?.colorPerPage}/pg</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                                        <span>Double Side:</span>
                                        <strong>₹{selectedShop.printingRates?.colourDouble ?? selectedShop.pricing?.colorPerPage}/pg</strong>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem', backgroundColor: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Spiral Binding:</span>
                                    <strong>₹{selectedShop.printingRates?.spiralBinding ?? selectedShop.pricing?.spiralBinding}</strong>
                                </div>
                                <div style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Book Binding:</span>
                                    <strong>₹{selectedShop.printingRates?.bookBinding ?? selectedShop.pricing?.bookBinding}</strong>
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <strong style={{ fontSize: '0.95rem' }}>Delivery Services</strong>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🏡 Home Delivery</div>
                                    <div>Status: <strong>{selectedShop.homeDelivery ? '🚚 Enabled' : '❌ Disabled'}</strong></div>
                                    {selectedShop.homeDelivery && (
                                        <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                                            {selectedShop.freeDelivery ? (
                                                <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>🆓 Free Delivery</span>
                                            ) : (
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Rates by Distance:</div>
                                                    {selectedShop.deliveryCharges && selectedShop.deliveryCharges.length > 0 ? (
                                                        selectedShop.deliveryCharges.map((slab, i) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                                <span>{slab.from} - {slab.to} KM:</span>
                                                                <strong>₹{slab.charge}</strong>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No slabs defined</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>⚡ Express Printing</div>
                                    <div>Status: <strong>{selectedShop.expressPrinting ? '✅ Available' : '❌ Unavailable'}</strong></div>
                                    {selectedShop.expressPrinting && (
                                        <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                                            {selectedShop.freeExpressDelivery ? (
                                                <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>🆓 Free Express Delivery</span>
                                            ) : (
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Rates by Distance:</div>
                                                    {selectedShop.expressDeliveryCharges && selectedShop.expressDeliveryCharges.length > 0 ? (
                                                        selectedShop.expressDeliveryCharges.map((slab, i) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                                <span>{slab.from} - {slab.to} KM:</span>
                                                                <strong>₹{slab.charge}</strong>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No slabs defined</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            {selectedShop.isCodAvailable ? (
                                <span className="badge badge-approved" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>💵 COD Available</span>
                            ) : (
                                <span className="badge badge-pending" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>💳 Online Only</span>
                            )}
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            onClick={() => {
                                handleOrderClick(selectedShop._id);
                                setSelectedShop(null);
                            }}
                        >
                            Order from Shop
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Shops;
