import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../context/ToastContext';
import './Order.css';

export const PaymentRequest = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [transactionId, setTransactionId] = useState('');

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/orders/${orderId}`);
            setOrder(res.data?.data || null);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to load order details', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const handleSubmitPayment = async (e) => {
        e.preventDefault();

        if (paymentMethod === 'UPI' && !transactionId.trim()) {
            showToast('Please enter the 12-digit UPI transaction reference ID', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await API.patch(`/orders/${orderId}/pay`, {
                paymentMethod,
                transactionId: paymentMethod === 'UPI' ? transactionId.trim() : ''
            });

            showToast(
                paymentMethod === 'UPI' 
                    ? 'UPI payment reference submitted successfully!' 
                    : 'Cash on Delivery selection confirmed!',
                'success'
            );
            navigate('/my-orders');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to submit payment details', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner spinner-lg"></div>
                <p>Retrieving order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="page-container">
                <div className="card text-center" style={{ padding: '3rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h2>Order Not Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        The order you are requesting does not exist or you do not have permission to view it.
                    </p>
                    <Link to="/my-orders" className="btn btn-primary">Go to My Orders</Link>
                </div>
            </div>
        );
    }

    const { shop, customer, documents, bwPages, colorPages, totalPages, copies, binding, printSide, status, finalPrice, estimatedDeliveryTime, paymentStatus } = order;
    const isAwaitingPayment = status === 'PAYMENT_REQUESTED';

    return (
        <div className="page-container">
            <div className="order-form-card card" style={{ maxWidth: '750px' }}>
                <div className="form-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Payment Request
                    </span>
                    <h2 style={{ marginTop: '0.25rem' }}>Order #{orderId.slice(-6).toUpperCase()}</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`badge`} style={{
                            backgroundColor: isAwaitingPayment ? 'var(--accent-light)' : 'var(--bg-input)',
                            color: isAwaitingPayment ? 'var(--accent-color)' : 'var(--text-secondary)',
                            fontWeight: 600
                        }}>
                            Status: {status.replace(/_/g, ' ')}
                        </span>
                        <span className={`badge`} style={{
                            backgroundColor: paymentStatus === 'PAID' ? '#10b98122' : 'var(--bg-input)',
                            color: paymentStatus === 'PAID' ? '#10b981' : 'var(--text-secondary)',
                            fontWeight: 600
                        }}>
                            Payment: {paymentStatus}
                        </span>
                    </div>
                </div>

                {/* Print Job Specifications */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                        Print Job Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div>
                            <small style={{ color: 'var(--text-muted)' }}>Shop Name</small>
                            <div style={{ fontWeight: 600 }}>{shop?.shopName || 'N/A'}</div>
                        </div>
                        <div>
                            <small style={{ color: 'var(--text-muted)' }}>Specs & Copies</small>
                            <div style={{ fontWeight: 500 }}>
                                {bwPages} B&W, {colorPages} Color ({totalPages} Total) &times; {copies} copies
                            </div>
                        </div>
                        <div>
                            <small style={{ color: 'var(--text-muted)' }}>Print & Binding</small>
                            <div style={{ fontWeight: 500 }}>
                                {printSide === 'SINGLE_SIDE' ? 'Single Sided' : 'Double Sided'}, {binding} Binding
                            </div>
                        </div>
                        <div>
                            <small style={{ color: 'var(--text-muted)' }}>Customer Contact</small>
                            <div style={{ fontWeight: 500 }}>{order.customerContact || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {/* Documents List */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <small style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Documents ({documents?.length || 0})</small>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {documents?.map((doc, idx) => (
                            <div key={idx} style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                                    📄 {doc.originalName}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    {(doc.size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing Summary */}
                <div style={{
                    padding: '1.25rem',
                    backgroundColor: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--accent-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Estimated Cost originally:</span>
                        <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{order.estimatedCost}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Final Approved Price:</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-color)' }}>₹{finalPrice || order.estimatedCost}</span>
                    </div>
                    {estimatedDeliveryTime && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            ⏰ Estimated Completion Time: <strong>{estimatedDeliveryTime}</strong>
                        </div>
                    )}
                </div>

                {/* Interactive Payment Section */}
                {isAwaitingPayment ? (
                    <form onSubmit={handleSubmitPayment} className="order-form">
                        <div className="form-group" style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>Choose Payment Option</label>
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="UPI"
                                        checked={paymentMethod === 'UPI'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <span>UPI Payment (Online)</span>
                                </label>
                                {shop?.isCodAvailable && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="COD"
                                            checked={paymentMethod === 'COD'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                        <span>Cash on Delivery (COD)</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {paymentMethod === 'UPI' ? (
                            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <small style={{ color: 'var(--text-muted)' }}>Shop UPI ID</small>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                                        {shop?.upiId || 'Not configured'}
                                    </div>
                                </div>

                                {shop?.upiQrCode && (
                                    <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Scan QR to Pay</div>
                                        <img
                                            src={shop.upiQrCode}
                                            alt="UPI QR Code"
                                            style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain', border: '1px solid var(--border-color)', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="transactionId">UPI Transaction Ref ID / UTR *</label>
                                    <input
                                        id="transactionId"
                                        type="text"
                                        placeholder="Enter the 12-digit transaction ID from UPI app"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        required
                                    />
                                    <small style={{ color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                                        Enter the reference number after making payment in your UPI app (GPay, PhonePe, Paytm, etc.).
                                    </small>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🚚</span> Cash on Delivery Selected
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                                    Please keep the exact amount (<strong>₹{finalPrice}</strong>) ready at the time of delivery or pickup.
                                </p>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary submit-btn" disabled={submitting} style={{ marginTop: '0.5rem' }}>
                            {submitting ? <div className="spinner"></div> : paymentMethod === 'UPI' ? 'Submit UPI Payment Details' : 'Confirm Cash on Delivery'}
                        </button>
                    </form>
                ) : (
                    <div className="card text-center" style={{ padding: '2rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>ℹ️</div>
                        <h4>Payment Not Pending</h4>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {status === 'PENDING_SHOP_ACCEPTANCE' && 'This order is awaiting shop acceptance and review.'}
                            {status === 'REJECTED_BY_SHOP' && 'This order was rejected by the shop owner.'}
                            {status === 'CANCELLED_BY_USER' && 'This order was cancelled.'}
                            {['PAYMENT_COMPLETED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(status) && 
                                'Payment action has already been completed for this order. It is currently being processed by the shop.'}
                        </p>
                        <Link to="/my-orders" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem', display: 'inline-block' }}>Back to My Orders</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentRequest;
