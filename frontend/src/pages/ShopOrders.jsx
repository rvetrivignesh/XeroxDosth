import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import './Order.css';

export const ShopOrders = () => {
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');

    // Modals state
    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [finalPrice, setFinalPrice] = useState('');
    const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');
    
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

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

    useEffect(() => {
        if (!loading && orders.length > 0) {
            const hash = window.location.hash;
            const queryIndex = hash.indexOf('?');
            if (queryIndex !== -1) {
                const searchParams = new URLSearchParams(hash.slice(queryIndex));
                const orderId = searchParams.get('orderId');
                if (orderId) {
                    setTimeout(() => {
                        const element = document.getElementById(`order-${orderId}`);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element.style.outline = '3px solid var(--accent-color)';
                            element.style.outlineOffset = '4px';
                            element.style.transition = 'outline 0.5s ease';
                            setTimeout(() => {
                                element.style.outline = 'none';
                            }, 4000);
                        }
                    }, 300);
                }
            }
        }
    }, [loading, orders]);

    // Workflow actions
    const handleAcceptClick = (order) => {
        setSelectedOrderId(order._id);
        setFinalPrice(order.estimatedCost || '');
        
        // Default to 2 hours from now formatted for datetime-local
        const defaultTime = new Date();
        defaultTime.setHours(defaultTime.getHours() + 2);
        const year = defaultTime.getFullYear();
        const month = String(defaultTime.getMonth() + 1).padStart(2, '0');
        const day = String(defaultTime.getDate()).padStart(2, '0');
        const hours = String(defaultTime.getHours()).padStart(2, '0');
        const minutes = String(defaultTime.getMinutes()).padStart(2, '0');
        setEstimatedDeliveryTime(`${year}-${month}-${day}T${hours}:${minutes}`);

        setAcceptModalOpen(true);
    };

    const handleAcceptSubmit = async (e) => {
        e.preventDefault();
        if (!finalPrice || Number(finalPrice) <= 0) {
            showToast('Please enter a valid price', 'error');
            return;
        }
        if (!estimatedDeliveryTime.trim()) {
            showToast('Please provide an estimated completion timeline', 'error');
            return;
        }

        setUpdatingId(selectedOrderId);
        try {
            await API.patch(`/orders/${selectedOrderId}/accept`, {
                finalPrice: Number(finalPrice),
                estimatedDeliveryTime: estimatedDeliveryTime.trim()
            });
            showToast('Order accepted and payment request sent!', 'success');
            setAcceptModalOpen(false);
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to accept order', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleRejectClick = (orderId) => {
        setSelectedOrderId(orderId);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setUpdatingId(selectedOrderId);
        try {
            await API.patch(`/orders/${selectedOrderId}/reject`, {
                rejectionReason: rejectionReason.trim()
            });
            showToast('Order rejected', 'info');
            setRejectModalOpen(false);
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reject order', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleStartPrinting = async (orderId) => {
        setUpdatingId(orderId);
        try {
            await API.patch(`/orders/${orderId}/status`, { status: 'IN_PROGRESS' });
            showToast('Order marked as in progress (printing started)', 'success');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to start printing', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleMarkReady = async (order) => {
        setUpdatingId(order._id);
        const nextStatus = order.fulfillmentType === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_PICKUP';
        try {
            await API.patch(`/orders/${order._id}/status`, { status: nextStatus });
            showToast(`Order status updated to: ${nextStatus.replace(/_/g, ' ')}`, 'success');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update status', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleMarkCompleted = async (order) => {
        setUpdatingId(order._id);
        try {
            // Setting status to COMPLETED automatically resolves paymentStatus to PAID on backend for COD
            await API.patch(`/orders/${order._id}/status`, { 
                status: 'COMPLETED',
                paymentStatus: 'PAID' 
            });
            showToast('Order marked as completed and paid!', 'success');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to complete order', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleConfirmPayment = async (orderId) => {
        setUpdatingId(orderId);
        try {
            await API.patch(`/orders/${orderId}/status`, { paymentStatus: 'PAID' });
            showToast('Payment verified and confirmed!', 'success');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to confirm payment', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleRequestPaymentAgain = async (orderId) => {
        const reason = window.prompt('Enter reason for requesting payment again (e.g. invalid transaction ID, screenshot blurry):');
        if (reason === null) return;
        
        setUpdatingId(orderId);
        try {
            await API.patch(`/orders/${orderId}/request-payment`, { reason });
            showToast('Payment request sent to customer again!', 'info');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to request payment again', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleApproveCancellation = async (orderId) => {
        if (!window.confirm('Approve customer cancellation request? The order will be cancelled.')) return;
        setUpdatingId(orderId);
        try {
            await API.patch(`/orders/${orderId}/approve-cancellation`);
            showToast('Order cancellation approved', 'info');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to approve cancellation', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleRejectCancellation = async (orderId) => {
        if (!window.confirm('Reject cancellation request? Order will return to active printing status.')) return;
        setUpdatingId(orderId);
        try {
            await API.patch(`/orders/${orderId}/reject-cancellation`);
            showToast('Order cancellation request rejected. Resuming printing.', 'info');
            fetchOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reject cancellation', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    // Filters logic
    const cancellationRequests = orders.filter((o) => o.status === 'CANCELLATION_REQUESTED');
    const filteredOrders = orders.filter((order) => {
        if (activeTab === 'ALL') return order.status !== 'CANCELLATION_REQUESTED';
        if (activeTab === 'PENDING') return order.status === 'PENDING_SHOP_ACCEPTANCE';
        if (activeTab === 'PAYMENT') return order.status === 'PAYMENT_REQUESTED';
        if (activeTab === 'PRINTING') return order.status === 'PAYMENT_COMPLETED' || order.status === 'IN_PROGRESS';
        if (activeTab === 'READY') return order.status === 'READY_FOR_PICKUP' || order.status === 'OUT_FOR_DELIVERY';
        if (activeTab === 'COMPLETED') return order.status === 'COMPLETED';
        if (activeTab === 'CANCELLED') return ['CANCELLED', 'CANCELLED_BY_USER', 'REJECTED_BY_SHOP', 'CANCELLATION_APPROVED'].includes(order.status);
        return true;
    });

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
                <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>Customer Orders</h1>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Manage approvals, payments, printing states, and fulfillment.</p>
            </div>

            {/* Cancellation Requests Alerts Panel */}
            {cancellationRequests.length > 0 && (
                <div className="card" style={{ border: '1px solid #ef4444', backgroundColor: '#ef44440c', padding: '1.25rem', marginBottom: '2rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚠️</span> Customer Cancellation Requests ({cancellationRequests.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {cancellationRequests.map((order) => (
                            <div key={order._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <strong style={{ display: 'block' }}>Order #{order._id.slice(-6).toUpperCase()} - {order.customer?.name}</strong>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Reason: <em>"{order.cancellationReason || 'No reason provided'}"</em>
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleApproveCancellation(order._id)} disabled={updatingId === order._id}>
                                        Approve Cancellation
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleRejectCancellation(order._id)} disabled={updatingId === order._id}>
                                        Deny & Print
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {[
                    { id: 'ALL', label: 'All Orders' },
                    { id: 'PENDING', label: 'Approvals' },
                    { id: 'PAYMENT', label: 'Awaiting Payment' },
                    { id: 'PRINTING', label: 'Printing' },
                    { id: 'READY', label: 'Ready/Dispatched' },
                    { id: 'COMPLETED', label: 'Completed' },
                    { id: 'CANCELLED', label: 'Cancelled/Rejected' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            background: activeTab === tab.id ? 'var(--accent-color)' : 'transparent',
                            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="empty-state card">
                    <h3>No Orders</h3>
                    <p>There are no customer orders in this category.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {filteredOrders.map((order) => {
                        const isPending = order.status === 'PENDING_SHOP_ACCEPTANCE';
                        const isAwaitingPayment = order.status === 'PAYMENT_REQUESTED';
                        const isPaid = order.paymentStatus === 'PAID';
                        const isCancelled = ['CANCELLED', 'CANCELLED_BY_USER', 'CANCELLATION_APPROVED'].includes(order.status);

                        return (
                            <div key={order._id} id={`order-${order._id}`} className="card" style={{ padding: '1.5rem' }}>
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
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                                            Customer: {order.customer?.name || 'User'} ({order.customer?.email || 'N/A'})
                                        </span>
                                        {order.customerContact && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                                                📞 Contact: <strong>{order.customerContact}</strong>
                                            </span>
                                        )}
                                        {order.customerEmail && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                                                ✉️ Contact Email: <strong>{order.customerEmail}</strong>
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Workflow Controls */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {isPending && (
                                            <>
                                                <button className="btn btn-primary btn-sm" onClick={() => handleAcceptClick(order)} disabled={updatingId === order._id}>
                                                    Approve Order
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleRejectClick(order._id)} disabled={updatingId === order._id}>
                                                    Reject Order
                                                </button>
                                            </>
                                        )}

                                        {order.status === 'PAYMENT_COMPLETED' && (
                                            <button className="btn btn-primary btn-sm" onClick={() => handleStartPrinting(order._id)} disabled={updatingId === order._id}>
                                                Start Printing 🖨️
                                            </button>
                                        )}

                                        {order.status === 'IN_PROGRESS' && (
                                            <button className="btn btn-primary btn-sm" onClick={() => handleMarkReady(order)} disabled={updatingId === order._id}>
                                                {order.fulfillmentType === 'DELIVERY' ? 'Dispatch for Delivery 🚚' : 'Mark Ready for Pickup 🏃'}
                                            </button>
                                        )}

                                        {['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status) && (
                                            <button className="btn btn-primary btn-sm" onClick={() => handleMarkCompleted(order)} disabled={updatingId === order._id}>
                                                Complete Order Checkmark ✓
                                            </button>
                                        )}

                                        {/* Payment verification action */}
                                        {!isPaid && ['PAYMENT_COMPLETED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status) && (
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleConfirmPayment(order._id)} disabled={updatingId === order._id}>
                                                Confirm Payment Received 💵
                                            </button>
                                        )}

                                        {/* Request Payment Again option for active accepted orders */}
                                        {!['PENDING_SHOP_ACCEPTANCE', 'CANCELLED', 'CANCELLED_BY_USER', 'REJECTED_BY_SHOP', 'CANCELLATION_APPROVED', 'CANCELLATION_REQUESTED', 'COMPLETED'].includes(order.status) && (
                                            <button className="btn btn-danger btn-sm" onClick={() => handleRequestPaymentAgain(order._id)} disabled={updatingId === order._id}>
                                                Request Payment Again 🔄
                                            </button>
                                        )}

                                        <span className="badge" style={{
                                            backgroundColor: isCancelled ? '#ef444415' : isPending ? 'var(--accent-light)' : 'var(--bg-input)',
                                            color: isCancelled ? '#ef4444' : isPending ? 'var(--accent-color)' : 'var(--text-secondary)',
                                            fontWeight: 700
                                        }}>
                                            {isCancelled ? 'Cancelled' : order.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
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

                                    <div>
                                        <small style={{ color: 'var(--text-muted)' }}>Pricing & Payment</small>
                                        <div style={{ fontWeight: 500 }}>
                                            {order.paymentMethod || 'Awaiting Payment Selector'} {order.transactionId && `(${order.transactionId})`}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Status: <strong>{order.paymentStatus}</strong>
                                        </div>
                                        {order.paymentScreenshot && (
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <a href={order.paymentScreenshot} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'underline' }}>
                                                    🖼️ View Payment Screenshot
                                                </a>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, marginTop: '0.15rem' }}>
                                            {order.finalPrice ? `Exact: ₹${order.finalPrice}` : `Est: ₹${order.estimatedCost}`}
                                        </div>
                                    </div>
                                </div>

                                {/* Documents list */}
                                <div>
                                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                                        Documents ({order.documents?.length || 0})
                                    </small>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                                                {isPdf ? 'Open PDF ↗' : 'View ↗'}
                                                            </a>
                                                            <a href={downloadUrl} download={name} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                                                Download 📥
                                                            </a>
                                                        </div>
                                                    </div>
                                                    {doc.pageCount !== undefined && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.4rem 0', borderTop: '1px dashed var(--border-color)', borderBottom: isImg ? '1px dashed var(--border-color)' : 'none' }}>
                                                            ⚙️ <strong>Settings:</strong> Pages {doc.startPage}–{doc.lastPage} ({doc.pageCount} total) • {doc.bwPages} B&W / {doc.colorPages} Color {doc.colorPageNumbersText ? `[Pages: ${doc.colorPageNumbersText}]` : ''} • {doc.copies} copy(ies) • {doc.printSide === 'SINGLE_SIDE' ? 'Single-Sided' : 'Double-Sided'} • Binding: {doc.binding}
                                                        </div>
                                                    )}
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

                                {order.instructions && (
                                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                                        <small style={{ color: 'var(--text-muted)', display: 'block' }}>Customer Instructions</small>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{order.instructions}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Accept Order pricing and completion timeline setup Modal */}
            <Modal
                isOpen={acceptModalOpen}
                onClose={() => setAcceptModalOpen(false)}
                title="Accept Print Order"
            >
                <form onSubmit={handleAcceptSubmit}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="finalPrice">Final Approved Exact Price (₹) *</label>
                        <input
                            id="finalPrice"
                            type="number"
                            placeholder="Enter exact total price..."
                            value={finalPrice}
                            onChange={(e) => setFinalPrice(e.target.value)}
                            required
                        />
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                            Calculated estimated cost: ₹{orders.find((o) => o._id === selectedOrderId)?.estimatedCost}
                        </small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="deliveryTimeline">Estimated Completion/Delivery Time *</label>
                        <input
                            id="deliveryTimeline"
                            type="datetime-local"
                            value={estimatedDeliveryTime}
                            onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setAcceptModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={updatingId === selectedOrderId}>
                            Confirm Acceptance
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Rejection reason modal */}
            <Modal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title="Reject Print Order"
            >
                <form onSubmit={handleRejectSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="rejectReason">Reason for rejecting this order (Optional)</label>
                        <textarea
                            id="rejectReason"
                            rows={3}
                            placeholder="e.g. Ink cartridge finished, shop closed today, etc."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setRejectModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-danger" disabled={updatingId === selectedOrderId}>
                            Confirm Rejection
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ShopOrders;
