import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import PageDetailsSummary from '../components/PageDetailsSummary';
import './Order.css';

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
    return `₹${Number(amount).toFixed(2)}`;
};

const formatEstimatedTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? timeStr : date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const OrderDetail = () => {
    const { orderId } = useParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Modals state for Shop Admin Actions
    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [finalPrice, setFinalPrice] = useState('');
    const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('');

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const [requestPaymentModalOpen, setRequestPaymentModalOpen] = useState(false);
    const [paymentRequestReason, setPaymentRequestReason] = useState('');

    // Customer cancellation modal state
    const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');

    // Screenshot zoom modal state
    const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);

    const fetchOrderDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await API.get(`/orders/${orderId}`);
            setOrder(res.data?.data || null);
        } catch (err) {
            console.error('Failed to load order details:', err);
            setError(err.response?.data?.message || 'Failed to retrieve order details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Fetching order details...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="page-container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Order Not Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        {error || 'Unable to locate the requested order.'}
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const isShopOwner = user?.role === 'SHOP' && (
        order.shop?.owner?.toString() === user._id?.toString() ||
        order.shop?.owner === user._id ||
        order.shop?.owner?._id?.toString() === user._id?.toString()
    );
    const isCustomer = user && order.customer && (
        order.customer._id?.toString() === user._id?.toString() ||
        order.customer === user._id
    );

    const status = order.status;
    const isPaid = order.paymentStatus === 'PAID';
    const isCancelled = ['CANCELLED', 'CANCELLED_BY_USER', 'REJECTED_BY_SHOP', 'CANCELLATION_APPROVED'].includes(status);
    const isPending = status === 'PENDING_SHOP_ACCEPTANCE';
    const isAwaitingPayment = status === 'PAYMENT_REQUESTED';
    const isPaymentCompleted = status === 'PAYMENT_COMPLETED';
    const isInProgress = status === 'IN_PROGRESS';
    const isDispatchedOrReady = ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(status);
    const isCompleted = status === 'COMPLETED';
    const isCancellationRequested = status === 'CANCELLATION_REQUESTED';

    const canCustomerCancelImmediately = isPending && !isCancelled;
    const canCustomerRequestCancellation = !isCancelled && !['CANCELLED', 'CANCELLED_BY_USER', 'CANCELLATION_APPROVED', 'COMPLETED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLATION_REQUESTED', 'PENDING_SHOP_ACCEPTANCE', 'REJECTED_BY_SHOP'].includes(status);

    const getStatusStep = () => {
        if (isCancelled) return -1;
        if (status === 'COMPLETED') return 4;
        if (status === 'OUT_FOR_DELIVERY' || status === 'READY_FOR_PICKUP') return 3;
        if (status === 'IN_PROGRESS' || status === 'PAYMENT_COMPLETED') return 2;
        if (status === 'ACCEPTED' || status === 'PAYMENT_REQUESTED') return 1;
        return 0; // PENDING_SHOP_ACCEPTANCE
    };

    const currentStep = getStatusStep();

    // --- Shop Admin Actions ---
    const handleOpenAcceptModal = () => {
        setFinalPrice(order.estimatedCost || order.totalAmount || '');
        setAcceptModalOpen(true);
    };

    const handleAcceptSubmit = async (e) => {
        e.preventDefault();
        if (!finalPrice || Number(finalPrice) <= 0) {
            showToast('Final price entry is mandatory and must be greater than 0', 'error');
            return;
        }

        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/accept`, {
                finalPrice: Number(finalPrice),
                estimatedDeliveryTime: order.requiredBy
            });
            showToast('Order approved and payment request sent to customer!', 'success');
            setAcceptModalOpen(false);
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to accept order', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/reject`, {
                rejectionReason: rejectionReason.trim()
            });
            showToast('Order rejected', 'info');
            setRejectModalOpen(false);
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reject order', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartPrinting = async () => {
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/status`, { status: 'IN_PROGRESS' });
            showToast('Order status updated: Printing In Progress 🖨️', 'success');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to start printing', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDispatch = async () => {
        setActionLoading(true);
        const nextStatus = order.fulfillmentType === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_PICKUP';
        try {
            await API.patch(`/orders/${orderId}/status`, { status: nextStatus });
            showToast(`Order dispatched: ${nextStatus.replace(/_/g, ' ')}!`, 'success');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to dispatch order', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkCompleted = async () => {
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/status`, {
                status: 'COMPLETED',
                paymentStatus: 'PAID'
            });
            showToast('Order marked as Completed and Paid! ✓', 'success');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to complete order', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/status`, { paymentStatus: 'PAID' });
            showToast('Payment confirmed and verified! 💵', 'success');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to confirm payment', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestPaymentAgainSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/request-payment`, {
                reason: paymentRequestReason.trim()
            });
            showToast('Payment requested again from customer!', 'info');
            setRequestPaymentModalOpen(false);
            setPaymentRequestReason('');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to request payment again', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveCancellation = async () => {
        if (!window.confirm('Approve customer cancellation request? The order will be cancelled.')) return;
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/approve-cancellation`);
            showToast('Order cancellation approved', 'info');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to approve cancellation', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectCancellation = async () => {
        if (!window.confirm('Reject cancellation request? The order will return to active printing.')) return;
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/reject-cancellation`);
            showToast('Cancellation request rejected. Resuming printing.', 'info');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to reject cancellation', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Customer Actions ---
    const handleCancelOrderImmediately = async () => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;
        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/cancel`);
            showToast('Order cancelled successfully', 'info');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to cancel order', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestCancellationSubmit = async (e) => {
        e.preventDefault();
        if (!cancellationReason.trim()) {
            showToast('Please enter a reason for cancellation', 'error');
            return;
        }

        setActionLoading(true);
        try {
            await API.patch(`/orders/${orderId}/request-cancellation`, {
                cancellationReason: cancellationReason.trim()
            });
            showToast('Cancellation request submitted to shop owner', 'success');
            setCancellationModalOpen(false);
            setCancellationReason('');
            fetchOrderDetails();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to request cancellation', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            {/* Top Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(isShopOwner ? '/shop-orders' : '/my-orders')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    ← Back to {isShopOwner ? 'Shop Orders' : 'My Orders'}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={fetchOrderDetails}
                        disabled={actionLoading}
                        title="Refresh order details"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Shop Owner Admin Control Bar */}
            {isShopOwner && (
                <div className="card" style={{
                    marginBottom: '1.5rem',
                    padding: '1.25rem 1.5rem',
                    backgroundColor: 'var(--bg-card)',
                    border: '2px solid var(--accent-color)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-color)', fontWeight: 700 }}>
                                🛠️ Shop Admin Control Panel
                            </span>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Manage order lifecycle, request payment, and dispatch updates for this order.
                            </div>
                        </div>

                        {/* Action Buttons based on status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            {isPending && (
                                <>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleOpenAcceptModal}
                                        disabled={actionLoading}
                                    >
                                        ✓ Approve Order
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => { setRejectionReason(''); setRejectModalOpen(true); }}
                                        disabled={actionLoading}
                                    >
                                        ✕ Reject Order
                                    </button>
                                </>
                            )}

                            {isPaymentCompleted && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleStartPrinting}
                                    disabled={actionLoading}
                                >
                                    🖨️ Start Printing
                                </button>
                            )}

                            {isInProgress && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleDispatch}
                                    disabled={actionLoading}
                                >
                                    {order.fulfillmentType === 'DELIVERY' ? '🚚 Dispatch for Delivery' : '🏃 Mark Ready for Pickup'}
                                </button>
                            )}

                            {isDispatchedOrReady && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleMarkCompleted}
                                    disabled={actionLoading}
                                >
                                    ✓ Complete Order & Mark Paid
                                </button>
                            )}

                            {/* Payment Confirmation button */}
                            {!isPaid && !isCancelled && !isPending && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleConfirmPayment}
                                    disabled={actionLoading}
                                    style={{ borderColor: '#10b981', color: '#10b981' }}
                                >
                                    💵 Confirm Payment Received
                                </button>
                            )}

                            {/* Request Payment Again button for active orders */}
                            {!['PENDING_SHOP_ACCEPTANCE', 'CANCELLED', 'CANCELLED_BY_USER', 'REJECTED_BY_SHOP', 'CANCELLATION_APPROVED', 'COMPLETED'].includes(status) && (
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => { setPaymentRequestReason(''); setRequestPaymentModalOpen(true); }}
                                    disabled={actionLoading}
                                >
                                    🔄 Request Payment Again
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cancellation Request Actions */}
                    {isCancellationRequested && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#ef444412',
                            border: '1px solid #ef444455',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                        }}>
                            <div>
                                <strong style={{ color: '#ef4444', display: 'block' }}>⚠️ Customer has requested to cancel this order</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Reason: <em>"{order.cancellationReason || 'No reason provided'}"</em>
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={handleApproveCancellation}
                                    disabled={actionLoading}
                                >
                                    Approve Cancellation
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleRejectCancellation}
                                    disabled={actionLoading}
                                >
                                    Deny & Continue Printing
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Customer Cancellation Request Alert */}
            {!isShopOwner && isCancellationRequested && (
                <div className="card" style={{
                    marginBottom: '1.5rem',
                    padding: '1rem 1.25rem',
                    backgroundColor: '#ef444410',
                    border: '1px solid #ef444440'
                }}>
                    <strong style={{ color: '#ef4444', display: 'block' }}>⏳ Cancellation Request Pending</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        You requested cancellation with reason: <em>"{order.cancellationReason}"</em>. Awaiting shop owner review.
                    </span>
                </div>
            )}

            {/* Rejection / Cancellation Notice */}
            {order.rejectionReason && status === 'REJECTED_BY_SHOP' && (
                <div className="card" style={{
                    marginBottom: '1.5rem',
                    padding: '1rem 1.25rem',
                    backgroundColor: '#ef444415',
                    border: '1px solid #ef444440'
                }}>
                    <strong style={{ color: '#ef4444', display: 'block' }}>✕ Order Rejected by Shop</strong>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Reason: {order.rejectionReason}
                    </span>
                </div>
            )}

            {/* Order Header Card */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Order Details
                        </span>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                            #{order._id.slice(-6).toUpperCase()}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 0.4rem 0' }}>
                            📅 <strong>Placed on:</strong> {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>⏰ <strong>Customer Required Deadline:</strong></span>
                            <span style={{ color: '#d97706', fontWeight: 700, backgroundColor: '#fef3c722', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #fde68a66' }}>
                                {order.requiredBy ? new Date(order.requiredBy).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'Not specified'}
                            </span>
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {order.deliveryType === 'EXPRESS' ? (
                                <span className="badge" style={{
                                    backgroundColor: '#ef44441c',
                                    color: '#ef4444',
                                    border: '1.5px solid #ef444466',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.3px',
                                    padding: '0.35rem 0.75rem',
                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)'
                                }}>
                                    ⚡ EXPRESS DELIVERY
                                </span>
                            ) : order.fulfillmentType === 'DELIVERY' ? (
                                <span className="badge" style={{
                                    backgroundColor: '#3b82f618',
                                    color: '#3b82f6',
                                    border: '1px solid #3b82f640',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    padding: '0.35rem 0.7rem'
                                }}>
                                    🚚 Standard Delivery
                                </span>
                            ) : (
                                <span className="badge" style={{
                                    backgroundColor: 'var(--bg-input)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    padding: '0.35rem 0.7rem'
                                }}>
                                    🏃 Shop Pickup
                                </span>
                            )}
                            
                            <span className={`badge badge-${status.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                                {status.replace(/_/g, ' ')}
                            </span>
                        </div>

                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isPaid ? '#10b981' : '#f59e0b' }}>
                            Payment: {order.paymentStatus} {order.paymentMethod ? `(${order.paymentMethod})` : ''}
                        </span>
                    </div>
                </div>

                {/* Customer action shortcuts */}
                {!isShopOwner && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {canCustomerCancelImmediately && (
                            <button className="btn btn-danger btn-sm" onClick={handleCancelOrderImmediately} disabled={actionLoading}>
                                ✕ Cancel Order
                            </button>
                        )}
                        {canCustomerRequestCancellation && (
                            <button className="btn btn-danger btn-sm" onClick={() => { setCancellationReason(''); setCancellationModalOpen(true); }} disabled={actionLoading}>
                                Request Cancellation
                            </button>
                        )}
                        {!isPaid && !isCancelled && isAwaitingPayment && (
                            <Link to={`/payment-request/${order._id}`} className="btn btn-primary btn-sm">
                                💳 Confirm Payment / Upload Proof
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Order Timeline Progress Stepper */}
            {!isCancelled && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Order Progress</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                        {[
                            { step: 0, label: 'Placed' },
                            { step: 1, label: 'Accepted' },
                            { step: 2, label: 'Printing' },
                            { step: 3, label: 'Dispatched' },
                            { step: 4, label: 'Completed' }
                        ].map((item) => {
                            const isDone = currentStep >= item.step;
                            const isCurrent = currentStep === item.step;

                            return (
                                <div key={item.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1 }}>
                                    <div
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: isDone ? '#10b981' : 'var(--bg-input)',
                                            color: isDone ? '#ffffff' : 'var(--text-muted)',
                                            border: isCurrent ? '3px solid #6366f1' : '1px solid var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {isDone ? '✓' : item.step + 1}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {item.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Order Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {/* Document Details & Color vs B&W Specifications */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                                Document & Printing Specifications
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Total: {order.totalPages} pages ({order.bwPages || 0} B&W, {order.colorPages || 0} Color) &times; {order.copies} copies
                            </span>
                        </div>
                        <span className="badge" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {order.printSide === 'SINGLE_SIDE' ? 'Single Sided' : 'Double Sided'} • Binding: {order.binding}
                        </span>
                    </div>

                    {order.documents && order.documents.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {order.documents.map((doc, idx) => {
                                const isPhysicalDoc = doc.publicId?.startsWith('PHYSICAL_DOC_') || doc.url === 'N/A' || doc.url?.includes('physical-doc.pdf');
                                const name = isPhysicalDoc ? 'Physical Record / Hardcopy (No File Attached)' : (doc.originalName || `Document ${idx + 1}`);
                                const url = doc.url;
                                const downloadUrl = url && url.includes('/upload/') ? url.replace('/upload/', '/upload/fl_attachment/') : url;
                                const isImg = doc.mimeType?.startsWith('image/');
                                const sizeStr = !isPhysicalDoc && doc.size ? `(${(doc.size / (1024 * 1024)).toFixed(2)} MB)` : '';

                                return (
                                    <div key={idx} style={{
                                        padding: '1.25rem',
                                        backgroundColor: 'var(--bg-input)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <strong style={{ fontSize: '0.95rem', color: isPhysicalDoc ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                                    {isPhysicalDoc ? '📄 ' : '📑 '} {name} {sizeStr}
                                                </strong>
                                            </div>

                                            {!isPhysicalDoc && url && url !== 'N/A' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                                    >
                                                        View / Open ↗
                                                    </a>
                                                    <a
                                                        href={downloadUrl}
                                                        download={doc.originalName || 'document'}
                                                        className="btn btn-primary btn-sm"
                                                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                                    >
                                                        Download 📥
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {!isPhysicalDoc && (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <PageDetailsSummary doc={doc} defaultExpanded={true} />
                                            </div>
                                        )}

                                        {!isPhysicalDoc && isImg && url && (
                                            <div style={{ display: 'flex', marginTop: '0.75rem' }}>
                                                <img
                                                    src={url}
                                                    alt={name}
                                                    style={{ maxWidth: '140px', maxHeight: '140px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Physical document provided directly.</p>
                    )}

                    {order.instructions && (
                        <div style={{ marginTop: '1.25rem', padding: '0.85rem', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#6366f1' }}>Special Instructions:</strong>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{order.instructions}</p>
                        </div>
                    )}
                </div>

                {/* Details Section: Shop, Customer & Fulfillment, Payment Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {/* Customer & Fulfillment Info */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            Customer & Delivery Details
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
                            <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block' }}>Customer Name</small>
                                <strong style={{ color: 'var(--text-primary)' }}>{order.customer?.name || 'Customer'}</strong>
                            </div>
                            <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block' }}>Contact Phone</small>
                                <span style={{ color: 'var(--text-primary)' }}>📞 {order.customerContact || order.customer?.phone || 'N/A'}</span>
                            </div>
                            {order.customerEmail && (
                                <div>
                                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Email</small>
                                    <span style={{ color: 'var(--text-primary)' }}>✉️ {order.customerEmail}</span>
                                </div>
                            )}
                            <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block' }}>Fulfillment Method</small>
                                <div style={{ marginTop: '0.2rem' }}>
                                    {order.deliveryType === 'EXPRESS' ? (
                                        <span className="badge" style={{ backgroundColor: '#ef44441c', color: '#ef4444', border: '1px solid #ef444466', fontWeight: 800 }}>
                                            ⚡ Express Home Delivery
                                        </span>
                                    ) : order.fulfillmentType === 'DELIVERY' ? (
                                        <strong style={{ color: 'var(--text-primary)' }}>🚚 Standard Home Delivery</strong>
                                    ) : (
                                        <strong style={{ color: 'var(--text-primary)' }}>🏃 Shop Pickup</strong>
                                    )}
                                </div>
                            </div>
                            {order.fulfillmentType === 'DELIVERY' && order.deliveryAddress && (
                                <div>
                                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Delivery Address</small>
                                    <span style={{ color: 'var(--text-primary)' }}>📍 {order.deliveryAddress}</span>
                                </div>
                            )}
                            <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block' }}>Customer Deadline</small>
                                <strong style={{ color: '#d97706' }}>
                                    ⏰ {order.requiredBy ? new Date(order.requiredBy).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'N/A'}
                                </strong>
                            </div>
                            {order.estimatedDeliveryTime && (
                                <div>
                                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Target Completion Time</small>
                                    <strong style={{ color: 'var(--accent-color)' }}>⏰ {formatEstimatedTime(order.estimatedDeliveryTime)}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shop Information */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            Print Shop Details
                        </h3>
                        <p style={{ fontWeight: 700, margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {order.shop?.shopName || 'Print Shop'}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                            📍 {order.shop?.location?.address || 'Address provided on acceptance'}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                            📞 Phone: {order.shop?.phone || 'N/A'}
                        </p>
                        {order.shop?.upiId && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                                💳 UPI ID: <strong>{order.shop.upiId}</strong>
                            </p>
                        )}
                    </div>

                    {/* Payment Breakdown & Proof */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            Payment & Cost Breakdown
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>B&W Pages ({order.bwPages || 0})</span>
                                <span>{formatCurrency(order.bwSubtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                <span>Color Pages ({order.colorPages || 0})</span>
                                <span>{formatCurrency(order.colorSubtotal)}</span>
                            </div>
                            {order.otherServiceCharges > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>Binding & Extra Charges</span>
                                    <span>{formatCurrency(order.otherServiceCharges)}</span>
                                </div>
                            )}
                            {order.deliveryCharge > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>Delivery Fee</span>
                                    <span>{formatCurrency(order.deliveryCharge)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                <span>Total Amount</span>
                                <span style={{ color: '#10b981' }}>{formatCurrency(order.finalPrice || order.totalAmount || order.estimatedCost)}</span>
                            </div>
                        </div>

                        {/* Payment method and transaction info */}
                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                            <div><strong>Method:</strong> {order.paymentMethod || order.paymentType || 'Not Selected'}</div>
                            <div><strong>Status:</strong> <span style={{ color: isPaid ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{order.paymentStatus}</span></div>
                            {order.transactionId && (
                                <div style={{ marginTop: '0.25rem' }}>
                                    <strong>Txn ID:</strong> <span style={{ fontFamily: 'monospace' }}>{order.transactionId}</span>
                                </div>
                            )}
                            {order.paymentScreenshot && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setScreenshotModalOpen(true)}
                                        style={{ fontSize: '0.75rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                                    >
                                        🖼️ View Payment Proof Screenshot
                                    </button>
                                </div>
                            )}
                        </div>

                        {!isPaid && !isCancelled && !isShopOwner && isAwaitingPayment && (
                            <Link to={`/payment-request/${order._id}`} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', textAlign: 'center' }}>
                                Upload Payment Proof 💳
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Accept Order pricing setup Modal (Approach 2: Automatic Deadline Adoption) */}
            <Modal
                isOpen={acceptModalOpen}
                onClose={() => setAcceptModalOpen(false)}
                title="Accept & Approve Print Order"
            >
                <form onSubmit={handleAcceptSubmit}>
                    {/* Customer Deadline Alert Banner */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        marginBottom: '1.25rem'
                    }}>
                        <span style={{ fontSize: '0.75rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            ⏰ Customer Required Deadline
                        </span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginTop: '0.25rem' }}>
                            {order.requiredBy ? new Date(order.requiredBy).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'N/A'}
                        </span>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                            By accepting, you commit to complete and fulfill this order by the customer's deadline. If unable to fulfill on time, please reject the order.
                        </small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="finalPrice">
                            Final Approved Exact Price (₹) * <span style={{ color: '#ef4444', fontWeight: 700 }}>(Mandatory)</span>
                        </label>
                        <input
                            id="finalPrice"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Enter exact approved price..."
                            value={finalPrice}
                            onChange={(e) => setFinalPrice(e.target.value)}
                            required
                            autoFocus
                        />
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                            Calculated estimated cost: <strong>₹{order.estimatedCost || order.totalAmount}</strong>
                        </small>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setAcceptModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                            {actionLoading ? 'Approving...' : 'Confirm Acceptance ✓'}
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
                        <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                            {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Request Payment Again modal */}
            <Modal
                isOpen={requestPaymentModalOpen}
                onClose={() => setRequestPaymentModalOpen(false)}
                title="Request Payment Again"
            >
                <form onSubmit={handleRequestPaymentAgainSubmit}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        This will notify the customer to re-submit their payment transaction ID and screenshot.
                    </p>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="payReqReason">Reason (Optional)</label>
                        <textarea
                            id="payReqReason"
                            rows={3}
                            placeholder="e.g. Transaction ID was invalid, screenshot was not readable, etc."
                            value={paymentRequestReason}
                            onChange={(e) => setPaymentRequestReason(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setRequestPaymentModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                            {actionLoading ? 'Sending...' : 'Send Payment Request'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Customer Request Cancellation Modal */}
            <Modal
                isOpen={cancellationModalOpen}
                onClose={() => setCancellationModalOpen(false)}
                title="Request Order Cancellation"
            >
                <form onSubmit={handleRequestCancellationSubmit}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        Since the shop has accepted this order, please provide a reason for requesting cancellation:
                    </p>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="custCancelReason">Reason for cancellation *</label>
                        <textarea
                            id="custCancelReason"
                            rows={3}
                            placeholder="Please explain why you need to cancel this order..."
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setCancellationModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                            {actionLoading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Screenshot Zoom Modal */}
            <Modal
                isOpen={screenshotModalOpen}
                onClose={() => setScreenshotModalOpen(false)}
                title="Payment Proof Screenshot"
            >
                {order.paymentScreenshot && (
                    <div style={{ textAlign: 'center' }}>
                        <img
                            src={order.paymentScreenshot}
                            alt="Payment Proof"
                            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', objectFit: 'contain' }}
                        />
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <a
                                href={order.paymentScreenshot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                            >
                                Open in New Tab ↗
                            </a>
                            {isShopOwner && !isPaid && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        setScreenshotModalOpen(false);
                                        handleConfirmPayment();
                                    }}
                                >
                                    Confirm Payment Received ✓
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default OrderDetail;
