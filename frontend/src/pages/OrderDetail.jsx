import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageDetailsSummary from '../components/PageDetailsSummary';
import './Order.css';

const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
    return `₹${Number(amount).toFixed(2)}`;
};

export const OrderDetail = () => {
    const { orderId } = useParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const isShopOwner = user?.role === 'SHOP' && order.shop?.owner?.toString() === user._id.toString();
    const status = order.status;
    const isPaid = order.paymentStatus === 'PAID';
    const isCancelled = ['CANCELLED', 'CANCELLED_BY_USER', 'REJECTED_BY_SHOP', 'CANCELLATION_APPROVED'].includes(status);

    const getStatusStep = () => {
        if (isCancelled) return -1;
        if (status === 'COMPLETED') return 4;
        if (status === 'OUT_FOR_DELIVERY' || status === 'READY_FOR_PICKUP') return 3;
        if (status === 'IN_PROGRESS' || status === 'PAYMENT_COMPLETED') return 2;
        if (status === 'ACCEPTED' || status === 'PAYMENT_REQUESTED') return 1;
        return 0; // PENDING_SHOP_ACCEPTANCE
    };

    const currentStep = getStatusStep();

    return (
        <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            {/* Top Navigation */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(isShopOwner ? '/shop-orders' : '/my-orders')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    ← Back to {isShopOwner ? 'Shop Orders' : 'My Orders'}
                </button>
            </div>

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
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                            Placed on {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <span className={`badge badge-${status.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                            {status.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isPaid ? '#10b981' : '#f59e0b' }}>
                            Payment: {order.paymentStatus}
                        </span>
                    </div>
                </div>
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
                {/* Document Details & Configuration */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Document & Print Specifications
                    </h3>

                    {order.documents && order.documents.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {order.documents.map((doc, idx) => {
                                const isPhysicalDoc = doc.publicId?.startsWith('PHYSICAL_DOC_') || doc.url === 'N/A' || doc.url?.includes('physical-doc.pdf');
                                return (
                                    <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPhysicalDoc ? 0 : '0.5rem' }}>
                                            <strong style={{ color: isPhysicalDoc ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                                {isPhysicalDoc ? '📄 Physical Record / Hardcopy (No File Attached)' : `📄 ${doc.originalName || 'Uploaded Document'}`}
                                            </strong>
                                            {!isPhysicalDoc && doc.url && doc.url !== 'N/A' && (
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                                    View File ↗
                                                </a>
                                            )}
                                        </div>
                                        {!isPhysicalDoc && <PageDetailsSummary document={doc} copies={order.copies} />}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Physical document provided directly.</p>
                    )}

                    {order.instructions && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#6366f1' }}>Special Instructions:</strong>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{order.instructions}</p>
                        </div>
                    )}
                </div>

                {/* Pricing & Shop Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Shop Information */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            Xerox Shop Details
                        </h3>
                        <p style={{ fontWeight: 700, margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {order.shop?.shopName || 'Print Shop'}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                            📍 {order.shop?.location?.address || 'Address provided on acceptance'}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                            📞 Phone: {order.shop?.phone || 'N/A'}
                        </p>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                            Payment Summary
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

                        {!isPaid && !isCancelled && !isShopOwner && status === 'PAYMENT_REQUESTED' && (
                            <Link to={`/payment-request/${order._id}`} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', textAlign: 'center' }}>
                                Upload Payment Proof 💳
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetail;
