import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import Modal from '../components/Modal';

export const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await API.get('/orders/me');
                if (res.data && res.data.data) {
                    setOrders(res.data.data);
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Loading your orders...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>Error Loading Orders</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>No Orders Found</h3>
                    <p>You haven't placed any print orders yet.</p>
                    <Link to="/place-order" className="btn btn-primary">
                        Place Your First Order
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>My Orders</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Track and view details of all your print jobs</p>
                </div>

                <Link to="/place-order" className="btn btn-primary">
                    + New Order
                </Link>
            </div>

            {/* Orders Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {orders.map((order) => (
                    <div key={order._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span className={`badge badge-${order.status.toLowerCase()}`}>
                                    {order.status}
                                </span>
                                <span className={`badge badge-${order.paymentStatus === 'PAID' ? 'approved' : 'pending'}`}>
                                    {order.paymentStatus} ({order.paymentMethod})
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                {order.shop?.shopName || 'Print Shop'}
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Order ID: {order._id}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                                <div>📄 <strong>{order.documents?.length || 0} Document(s)</strong></div>
                                <div>🖨️ {order.totalPages} pages ({order.bwPages || 0} B&W, {order.colorPages || 0} Color)</div>
                                <div>📦 {order.copies} copy/copies • {order.printSide} • {order.binding}</div>
                                <div>⏰ Deadline: <strong>{new Date(order.requiredBy).toLocaleString()}</strong></div>
                            </div>
                        </div>

                        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                                {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedOrder(order)}
                            >
                                Detailed View
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detailed Order View Modal */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title="Order Details"
            >
                {selectedOrder && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedOrder.shop?.shopName || 'Print Shop'}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {selectedOrder._id}</span>
                                {selectedOrder.shop && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        📞 {selectedOrder.shop.phone} | ✉️ {selectedOrder.shop.email}
                                    </div>
                                )}
                            </div>
                            <span className={`badge badge-${selectedOrder.status.toLowerCase()}`}>
                                {selectedOrder.status}
                            </span>
                        </div>

                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                            <div><strong>B&W Pages:</strong> {selectedOrder.bwPages || 0}</div>
                            <div><strong>Color Pages:</strong> {selectedOrder.colorPages || 0}</div>
                            <div><strong>Total Pages:</strong> {selectedOrder.totalPages}</div>
                            <div><strong>Copies:</strong> {selectedOrder.copies}</div>
                            <div><strong>Print Side:</strong> {selectedOrder.printSide}</div>
                            <div><strong>Binding:</strong> {selectedOrder.binding}</div>
                            <div><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</div>
                            <div><strong>Payment Status:</strong> {selectedOrder.paymentStatus}</div>
                            {selectedOrder.paymentMethod === 'ONLINE' && (
                                <div><strong>Transaction ID:</strong> {selectedOrder.transactionId || 'N/A'}</div>
                            )}
                        </div>

                        <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                                Required Deadline
                            </strong>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {new Date(selectedOrder.requiredBy).toLocaleString()}
                            </p>
                        </div>

                        {selectedOrder.instructions && (
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                                    Special Instructions
                                </strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                                    {selectedOrder.instructions}
                                </p>
                            </div>
                        )}

                        <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                                Documents ({selectedOrder.documents?.length})
                            </strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {selectedOrder.documents?.map((doc, idx) => {
                                    const name = doc.originalName || doc.fileName;
                                    const url = doc.url || doc.fileUrl;
                                    const isImg = doc.mimeType?.startsWith('image/');
                                    const sizeStr = doc.size ? `(${(doc.size / (1024 * 1024)).toFixed(2)} MB)` : '';
                                    return (
                                        <div key={idx} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{name} <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>{sizeStr}</span></span>
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                                                    Open ↗
                                                </a>
                                            </div>
                                            {isImg && (
                                                <div style={{ display: 'flex', marginTop: '0.25rem' }}>
                                                    <img 
                                                        src={url} 
                                                        alt={name} 
                                                        style={{ 
                                                            maxWidth: '120px', 
                                                            maxHeight: '120px', 
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
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MyOrders;
