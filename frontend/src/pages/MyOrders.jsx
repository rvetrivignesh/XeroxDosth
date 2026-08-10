import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

export const MyOrders = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancellationOrderId, setCancellationOrderId] = useState('');
    const [submittingCancellation, setSubmittingCancellation] = useState(false);

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

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleCancelImmediately = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order immediately?')) return;
        try {
            await API.patch(`/orders/${orderId}/cancel`);
            showToast('Order cancelled successfully', 'info');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to cancel order', 'error');
        }
    };

    const triggerCancellationModal = (orderId) => {
        setCancellationOrderId(orderId);
        setCancellationReason('');
        setCancellationModalOpen(true);
    };

    const handleRequestCancellation = async (e) => {
        e.preventDefault();
        if (!cancellationReason.trim()) {
            showToast('Please provide a reason for cancellation', 'error');
            return;
        }

        setSubmittingCancellation(true);
        try {
            await API.patch(`/orders/${cancellationOrderId}/request-cancellation`, {
                cancellationReason: cancellationReason.trim()
            });
            showToast('Cancellation request submitted to the shop', 'success');
            setCancellationModalOpen(false);
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to request cancellation', 'error');
        } finally {
            setSubmittingCancellation(false);
        }
    };

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
                <div className="empty-state card">
                    <h3>No Orders Found</h3>
                    <p>You haven't placed any print orders yet.</p>
                    <Link to="/place-order" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                        Place Your First Order
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>My Orders</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Track and view details of all your print jobs</p>
                </div>

                <Link to="/place-order" className="btn btn-primary">
                    + New Order
                </Link>
            </div>

            {/* Orders Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {orders.map((order) => {
                    const isPendingAcceptance = order.status === 'PENDING_SHOP_ACCEPTANCE';
                    const isAwaitingPayment = order.status === 'PAYMENT_REQUESTED';
                    const canCancelImmediately = isPendingAcceptance;
                    const canRequestCancellation = !['CANCELLED', 'COMPLETED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLATION_APPROVED', 'CANCELLATION_REQUESTED', 'PENDING_SHOP_ACCEPTANCE', 'REJECTED_BY_SHOP'].includes(order.status);

                    return (
                        <div key={order._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <span className={`badge`} style={{
                                        backgroundColor: isPendingAcceptance ? 'var(--accent-light)' : isAwaitingPayment ? '#f59e0b22' : 'var(--bg-input)',
                                        color: isPendingAcceptance ? 'var(--accent-color)' : isAwaitingPayment ? '#d97706' : 'var(--text-secondary)',
                                        fontWeight: 700
                                    }}>
                                        {order.status.replace(/_/g, ' ')}
                                    </span>
                                    <span className={`badge`} style={{
                                        backgroundColor: order.paymentStatus === 'PAID' ? '#10b98122' : 'var(--bg-input)',
                                        color: order.paymentStatus === 'PAID' ? '#10b981' : 'var(--text-secondary)',
                                        fontWeight: 600
                                    }}>
                                        {order.paymentStatus} {order.paymentMethod ? `(${order.paymentMethod})` : ''}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                    {order.shop?.shopName || 'Print Shop'}
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    Order ID: #{order._id.slice(-6).toUpperCase()}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    <div>📄 <strong>{order.documents?.length || 0} Document(s)</strong></div>
                                    <div>🖨️ {order.totalPages} pages ({order.bwPages || 0} B&W, {order.colorPages || 0} Color) &times; {order.copies} copies</div>
                                    <div>📦 {order.printSide.replace(/_/g, ' ')} • {order.binding} Binding</div>
                                    <div>⏰ Deadline: <strong>{new Date(order.requiredBy).toLocaleString()}</strong></div>
                                    {order.estimatedDeliveryTime && (
                                        <div style={{ color: 'var(--accent-color)', fontWeight: 600 }}>⏰ Shop Delivery Time: {order.estimatedDeliveryTime}</div>
                                    )}
                                    <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem', fontWeight: 600 }}>
                                        Price: {order.finalPrice ? `₹${order.finalPrice} (Exact)` : `₹${order.estimatedCost} (Est.)`}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {isAwaitingPayment && (
                                    <Link to={`/payment-request/${order._id}`} className="btn btn-primary btn-sm text-center" style={{ display: 'block', textDecoration: 'none' }}>
                                        💳 Complete Payment / COD
                                    </Link>
                                )}

                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </span>
                                    
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {canCancelImmediately && (
                                            <button className="btn btn-danger btn-sm" onClick={() => handleCancelImmediately(order._id)}>
                                                Cancel Order
                                            </button>
                                        )}
                                        {canRequestCancellation && (
                                            <button className="btn btn-danger btn-sm" onClick={() => triggerCancellationModal(order._id)}>
                                                Request Cancel
                                            </button>
                                        )}
                                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(order)}>
                                            View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detailed Order View Modal */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title="Order Details"
            >
                {selectedOrder && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>{selectedOrder.shop?.shopName || 'Print Shop'}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {selectedOrder._id}</span>
                                {selectedOrder.shop && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        📞 {selectedOrder.shop.phone} | ✉️ {selectedOrder.shop.email}
                                    </div>
                                )}
                            </div>
                            <span className="badge" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 700 }}>
                                {selectedOrder.status.replace(/_/g, ' ')}
                            </span>
                        </div>

                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                            <div><strong>B&W Pages:</strong> {selectedOrder.bwPages || 0}</div>
                            <div><strong>Color Pages:</strong> {selectedOrder.colorPages || 0}</div>
                            <div><strong>Total Pages:</strong> {selectedOrder.totalPages}</div>
                            <div><strong>Copies:</strong> {selectedOrder.copies}</div>
                            <div><strong>Print Side:</strong> {selectedOrder.printSide.replace(/_/g, ' ')}</div>
                            <div><strong>Binding:</strong> {selectedOrder.binding}</div>
                            <div><strong>Payment Method:</strong> {selectedOrder.paymentMethod || 'Not Selected'}</div>
                            <div><strong>Payment Status:</strong> {selectedOrder.paymentStatus}</div>
                            <div><strong>Estimated Price:</strong> ₹{selectedOrder.estimatedCost}</div>
                            <div><strong>Final Price:</strong> {selectedOrder.finalPrice ? `₹${selectedOrder.finalPrice}` : 'Awaiting Approval'}</div>
                            {selectedOrder.transactionId && (
                                <div style={{ gridColumn: 'span 2' }}><strong>Transaction Ref ID:</strong> {selectedOrder.transactionId}</div>
                            )}
                        </div>

                        {selectedOrder.estimatedDeliveryTime && (
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                                    Estimated Delivery/Completion Time
                                </strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    {selectedOrder.estimatedDeliveryTime}
                                </p>
                            </div>
                        )}

                        {selectedOrder.rejectionReason && (
                            <div style={{ padding: '0.75rem', backgroundColor: '#ef444415', border: '1px solid #ef444430', borderRadius: 'var(--radius-sm)' }}>
                                <strong style={{ fontSize: '0.9rem', color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>
                                    Rejection Reason from Shop
                                </strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    {selectedOrder.rejectionReason}
                                </p>
                            </div>
                        )}

                        {selectedOrder.cancellationReason && (
                            <div style={{ padding: '0.75rem', backgroundColor: '#ef444415', border: '1px solid #ef444430', borderRadius: 'var(--radius-sm)' }}>
                                <strong style={{ fontSize: '0.9rem', color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>
                                    Cancellation Reason
                                </strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    {selectedOrder.cancellationReason}
                                </p>
                            </div>
                        )}

                        {selectedOrder.instructions && (
                            <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                                    Special Instructions
                                </strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', margin: 0 }}>
                                    {selectedOrder.instructions}
                                </p>
                            </div>
                        )}

                        <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                                Documents ({selectedOrder.documents?.length || 0})
                            </strong>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {selectedOrder.documents?.map((doc, idx) => {
                                    const name = doc.originalName || doc.fileName;
                                    const url = doc.url || doc.fileUrl;
                                    const downloadUrl = url.includes('/upload/') ? url.replace('/upload/', '/upload/fl_attachment/') : url;
                                    const isImg = doc.mimeType?.startsWith('image/');
                                    const sizeStr = doc.size ? `(${(doc.size / (1024 * 1024)).toFixed(2)} MB)` : '';

                                    return (
                                        <div key={idx} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                                                    📄 {name} <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>{sizeStr}</span>
                                                </span>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                                        Open ↗
                                                    </a>
                                                    <a href={downloadUrl} download={name} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                                        Download 📥
                                                    </a>
                                                </div>
                                            </div>
                                            {isImg && (
                                                <div style={{ display: 'flex', marginTop: '0.25rem' }}>
                                                    <img src={url} alt={name} style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
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

            {/* Request Cancellation Dialog */}
            <Modal
                isOpen={cancellationModalOpen}
                onClose={() => setCancellationModalOpen(false)}
                title="Request Cancellation"
            >
                <form onSubmit={handleRequestCancellation}>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Since the shop has already approved this order, direct cancellation is disabled. Please request cancellation from the shop owner.
                    </p>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="cancelReason">Reason for cancellation *</label>
                        <textarea
                            id="cancelReason"
                            rows={3}
                            placeholder="Please explain why you need to cancel this order..."
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setCancellationModalOpen(false)} disabled={submittingCancellation}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-danger" disabled={submittingCancellation}>
                            {submittingCancellation ? <div className="spinner"></div> : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MyOrders;
