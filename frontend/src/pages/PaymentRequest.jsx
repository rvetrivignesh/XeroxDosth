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
    const [isQrZoomed, setIsQrZoomed] = useState(false);

    // Screenshot states
    const [screenshotUrl, setScreenshotUrl] = useState('');
    const [screenshotPublicId, setScreenshotPublicId] = useState('');
    const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

    const handleScreenshotChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file (PNG/JPG/JPEG)', 'error');
            return;
        }

        setUploadingScreenshot(true);
        const formData = new FormData();
        formData.append('document', file);

        try {
            const res = await API.post('/uploads', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            const data = res.data?.data;
            if (data?.url) {
                setScreenshotUrl(data.url);
                setScreenshotPublicId(data.publicId);
                showToast('Screenshot uploaded successfully!', 'success');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload screenshot', 'error');
        } finally {
            setUploadingScreenshot(false);
        }
    };

    const handleRemoveScreenshot = async () => {
        if (!screenshotPublicId) return;
        try {
            await API.delete(`/uploads?publicId=${encodeURIComponent(screenshotPublicId)}`);
            setScreenshotUrl('');
            setScreenshotPublicId('');
            showToast('Screenshot removed', 'info');
        } catch (err) {
            console.error(err);
        }
    };

    const handleCopyUpi = () => {
        if (order?.shop?.upiId) {
            navigator.clipboard.writeText(order.shop.upiId);
            showToast('UPI ID copied to clipboard!', 'success');
        }
    };

    const getQrCodeUrl = () => {
        if (!order?.shop) return null;
        return order.shop.upiQrCode || (order.shop.upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${order.shop.upiId}&pn=${order.shop.shopName}&am=${order.finalPrice || order.estimatedCost}`)}` : null);
    };

    const handleDownloadQr = async () => {
        const qrUrl = getQrCodeUrl();
        if (!qrUrl) return;
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${order.shop.shopName.replace(/\s+/g, '_')}_UPI_QR.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showToast('QR Code download started!', 'success');
        } catch (err) {
            const link = document.createElement('a');
            link.href = qrUrl;
            link.target = '_blank';
            link.download = `${order.shop.shopName.replace(/\s+/g, '_')}_UPI_QR.png`;
            link.click();
            showToast('Opening QR code image in a new tab', 'info');
        }
    };

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
                transactionId: paymentMethod === 'UPI' ? transactionId.trim() : '',
                paymentScreenshot: paymentMethod === 'UPI' ? screenshotUrl : ''
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
            <div className="order-form-card card payment-request-card">
                <div className="form-header payment-request-header">
                    <span className="payment-request-subtitle">
                        Payment Request
                    </span>
                    <h2 className="payment-request-title">Order #{orderId.slice(-6).toUpperCase()}</h2>
                    <div className="payment-status-badge-row">
                        <span className="badge badge-pending payment-status-badge">
                            Status: {status.replace(/_/g, ' ')}
                        </span>
                        <span className="badge badge-approved payment-status-badge">
                            Payment: {paymentStatus}
                        </span>
                    </div>
                </div>

                {/* Print Job Specifications */}
                <div className="payment-details-section">
                    <h3 className="payment-details-heading">
                        Print Job Details
                    </h3>
                    <div className="payment-details-grid">
                        <div className="payment-details-col">
                            <small className="payment-details-label">Shop Name</small>
                            <div className="payment-details-val-bold">{shop?.shopName || 'N/A'}</div>
                        </div>
                        <div className="payment-details-col">
                            <small className="payment-details-label">Specs & Copies</small>
                            <div className="payment-details-val">
                                {bwPages} B&W, {colorPages} Color ({totalPages} Total) &times; {copies} copies
                            </div>
                        </div>
                        <div className="payment-details-col">
                            <small className="payment-details-label">Print & Binding</small>
                            <div className="payment-details-val">
                                {printSide === 'SINGLE_SIDE' ? 'Single Sided' : 'Double Sided'}, {binding} Binding
                            </div>
                        </div>
                        <div className="payment-details-col">
                            <small className="payment-details-label">Customer Contact</small>
                            <div className="payment-details-val">{order.customerContact || 'N/A'}</div>
                        </div>
                        {order.customerEmail && (
                            <div className="payment-details-col">
                                <small className="payment-details-label">Customer Email</small>
                                <div className="payment-details-val">{order.customerEmail}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Documents List */}
                <div className="payment-docs-section">
                    <small className="payment-docs-title">Documents ({documents?.length || 0})</small>
                    <div className="payment-docs-list">
                        {documents?.map((doc, idx) => (
                            <div key={idx} className="payment-doc-card">
                                <span className="payment-doc-name">
                                    📄 {doc.originalName}
                                </span>
                                <span className="payment-doc-size">
                                    {(doc.size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing Summary */}
                <div className="final-pricing-box">
                    <div className="final-pricing-row">
                        <span className="original-price-label">Estimated Cost originally:</span>
                        <span className="original-price-val">₹{order.estimatedCost}</span>
                    </div>
                    <div className="final-pricing-row-divider">
                        <span className="final-price-label">Final Approved Price:</span>
                        <span className="final-price-val">₹{finalPrice || order.estimatedCost}</span>
                    </div>
                    {estimatedDeliveryTime && (
                        <div className="final-pricing-time">
                            ⏰ Estimated Completion Time: <strong>{estimatedDeliveryTime}</strong>
                        </div>
                    )}
                </div>

                {/* Interactive Payment Section */}
                {isAwaitingPayment ? (
                    <form onSubmit={handleSubmitPayment} className="order-form">
                        <div className="form-group payment-option-card">
                            <label className="payment-option-heading">Choose Payment Option</label>
                            <div className="payment-option-choices">
                                <label className="payment-option-label">
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
                                    <label className="payment-option-label">
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
                            <div className="upi-payment-form">
                                <div>
                                    <small className="upi-id-label">Shop UPI ID</small>
                                    <div className="upi-id-row">
                                        <span className="upi-id-val">
                                            {shop?.upiId || 'Not configured'}
                                        </span>
                                        {shop?.upiId && (
                                            <button 
                                                type="button" 
                                                onClick={handleCopyUpi} 
                                                className="btn btn-secondary btn-xs copy-upi-btn"
                                            >
                                                📋 Copy UPI
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {getQrCodeUrl() && (
                                    <div className="qr-code-wrapper">
                                        <small className="qr-code-label">Scan QR to Pay (Click to zoom)</small>
                                        <img
                                            src={getQrCodeUrl()}
                                            alt="UPI QR Code"
                                            onClick={() => setIsQrZoomed(true)}
                                            className="qr-code-image"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={handleDownloadQr} 
                                            className="btn btn-secondary btn-xs download-qr-btn"
                                        >
                                            📥 Download QR Code
                                        </button>
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
                                    <small className="field-help">
                                        Enter the reference number after making payment in your UPI app (GPay, PhonePe, Paytm, etc.).
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="paymentScreenshot">Attach Payment Screenshot (Optional)</label>
                                    <input
                                        id="paymentScreenshot"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleScreenshotChange}
                                        style={{ marginTop: '0.25rem', display: 'block' }}
                                    />
                                    {uploadingScreenshot && <small className="field-help" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Uploading screenshot...</small>}
                                    {screenshotUrl && (
                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                                            <img src={screenshotUrl} alt="Payment Screenshot Preview" style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                                            <button type="button" className="btn btn-danger btn-xs" onClick={handleRemoveScreenshot}>Remove Screenshot</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="cod-payment-info">
                                <div className="cod-payment-heading">
                                    <span>🚚</span> Cash on Delivery Selected
                                </div>
                                <p className="cod-payment-desc">
                                    Please keep the exact amount (<strong>₹{finalPrice}</strong>) ready at the time of delivery or pickup.
                                </p>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
                            {submitting ? <div className="spinner"></div> : paymentMethod === 'UPI' ? 'Submit UPI Payment Details' : 'Confirm Cash on Delivery'}
                        </button>
                    </form>
                ) : (
                    <div className="card text-center payment-completed-box">
                        <div className="payment-completed-icon">ℹ️</div>
                        <h4 className="payment-completed-heading">Payment Not Pending</h4>
                        <p className="payment-completed-desc">
                            {status === 'PENDING_SHOP_ACCEPTANCE' && 'This order is awaiting shop acceptance and review.'}
                            {status === 'REJECTED_BY_SHOP' && 'This order was rejected by the shop owner.'}
                            {status === 'CANCELLED_BY_USER' && 'This order was cancelled.'}
                            {['PAYMENT_COMPLETED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(status) && 
                                'Payment action has already been completed for this order. It is currently being processed by the shop.'}
                        </p>
                        <Link to="/my-orders" className="btn btn-secondary btn-sm payment-completed-btn">Back to My Orders</Link>
                    </div>
                )}
            </div>

            {/* click to close full screen QR Code Zoom Modal */}
            {isQrZoomed && (
                <div className="qr-zoom-backdrop" onClick={() => setIsQrZoomed(false)}>
                    <div className="qr-zoom-container">
                        <img src={getQrCodeUrl()} alt="Zoomed UPI QR Code" className="qr-zoom-img" />
                        <div className="qr-zoom-close-btn">✕</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentRequest;
