import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import './Order.css';

const ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'PRINTING', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export const ShopOrders = () => {
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await API.get('/orders/shop');
            setOrders(res.data?.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load shop orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            await API.patch(`/orders/${orderId}/status`, { status: newStatus });
            showToast(`Order status updated to ${newStatus}`, 'success');
            setOrders((prev) =>
                prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
            );
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update order status', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading shop customer orders...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Customer Orders</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage print orders submitted to your shop.</p>
            </div>

            {orders.length === 0 ? (
                <div className="empty-state card">
                    <h3>No Orders Yet</h3>
                    <p>When customers place orders at your shop, they will appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {orders.map((order) => (
                        <div key={order._id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border-color)',
                                paddingBottom: '0.75rem',
                                marginBottom: '1rem',
                                flexWrap: 'wrap',
                                gap: '0.75rem'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                                        Order #{order._id.slice(-6).toUpperCase()}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Customer: {order.customer?.name || 'User'} ({order.customer?.email || 'N/A'}, {order.customer?.phone || 'N/A'})
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        Status:
                                    </label>
                                    <select
                                        value={order.status}
                                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                        disabled={updatingId === order._id}
                                        style={{
                                            padding: '0.35rem 0.65rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-color)',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        {ORDER_STATUSES.map((st) => (
                                            <option key={st} value={st}>
                                                {st}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Fulfillment</small>
                                    <div style={{ fontWeight: 600 }}>
                                        {order.fulfillmentType === 'DELIVERY' ? '🚚 Home Delivery' : '🏃 Shop Pickup'}
                                    </div>
                                    {order.fulfillmentType === 'DELIVERY' && order.deliveryAddress && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Address: {order.deliveryAddress}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Pages & Copies</small>
                                    <div style={{ fontWeight: 500 }}>
                                        {order.bwPages} B&W, {order.colorPages} Color ({order.totalPages} Total) &times; {order.copies} copies
                                    </div>
                                </div>

                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Print & Binding</small>
                                    <div style={{ fontWeight: 500 }}>
                                        {order.printSide === 'SINGLE_SIDE' ? 'Single Sided' : 'Double Sided'}, Binding: {order.binding}
                                    </div>
                                </div>

                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Required Deadline</small>
                                    <div style={{ fontWeight: 500 }}>
                                        {new Date(order.requiredBy).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Documents list */}
                            <div style={{ marginTop: '1.25rem' }}>
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                                    Documents ({order.documents?.length || 0})
                                </small>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {order.documents?.map((doc, idx) => {
                                        const name = doc.originalName || doc.fileName;
                                        const url = doc.url || doc.fileUrl;
                                        const downloadUrl = url.includes('/upload/') ? url.replace('/upload/', '/upload/fl_attachment/') : url;
                                        const isImg = doc.mimeType?.startsWith('image/');
                                        const isPdf = doc.mimeType === 'application/pdf';
                                        const sizeStr = doc.size ? `(${(doc.size / (1024 * 1024)).toFixed(2)} MB)` : '';

                                        return (
                                            <div key={idx} style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '0.5rem', 
                                                padding: '0.75rem', 
                                                backgroundColor: 'var(--bg-input)', 
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                        📄 {name} <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>{sizeStr}</span>
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <a 
                                                            href={url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                        >
                                                            {isPdf ? 'Open PDF ↗' : 'View ↗'}
                                                        </a>
                                                        <a 
                                                            href={downloadUrl} 
                                                            download={name}
                                                            className="btn btn-primary btn-sm"
                                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                        >
                                                            Download 📥
                                                        </a>
                                                    </div>
                                                </div>
                                                {isImg && (
                                                    <div style={{ display: 'flex', marginTop: '0.25rem' }}>
                                                        <img 
                                                            src={url} 
                                                            alt={name} 
                                                            style={{ 
                                                                maxWidth: '150px', 
                                                                maxHeight: '150px', 
                                                                objectFit: 'cover', 
                                                                borderRadius: '4px', 
                                                                border: '1px solid var(--border-color)' 
                                                            }} 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {order.instructions && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Customer Instructions</small>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{order.instructions}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ShopOrders;
