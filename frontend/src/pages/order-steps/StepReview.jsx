import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext';
import PageDetailsSummary from '../../components/PageDetailsSummary';
import OrderPriceSummary from '../../components/OrderPriceSummary';

export const StepReview = () => {
    const {
        serviceType,
        selectedShop,
        files,
        customerContact,
        customerEmail,
        instructions,
        requiredBy,
        fulfillmentMethod,
        deliveryType,
        paymentType,
        deliveryAddress,
        recordPickupLocation,
        recordPickupTime,
        recordBindingType,
        recordCoverColor,
        recordDeliveryOption,
        recordDeliveryAddress,
        loading,
        isAllFilesValid,
        handlePlaceOrderSubmit
    } = useOrder();

    const navigate = useNavigate();

    return (
        <div className="step-container fade-in">
            <div className="step-header text-center" style={{ marginBottom: '2.5rem' }}>
                <h2>Review Your Order</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Review all configurations and finalize your print order request.</p>
            </div>

            <div className="review-order-page">
                {/* A. Service and Shop details */}
                <div className="review-section">
                    <h3>Service &amp; Shop</h3>
                    <div className="review-grid">
                        <div className="review-grid-item">
                            <span>Selected Service</span>
                            <strong>
                                {serviceType === 'PRINT' && 'Direct Printing'}
                                {serviceType === 'DELIVERY' && 'Home Delivery'}
                                {serviceType === 'RECORD' && 'Record Pickup & Binding'}
                            </strong>
                        </div>
                        <div className="review-grid-item">
                            <span>Xerox Partner</span>
                            <strong>{selectedShop?.shopName}</strong>
                        </div>
                        <div className="review-grid-item">
                            <span>Shop Location</span>
                            <strong>📍 {selectedShop?.location?.address}</strong>
                        </div>
                    </div>
                </div>

                {/* B. Fulfillment, Contact & Deadlines */}
                <div className="review-section">
                    <h3>Fulfillment &amp; Details</h3>
                    <div className="review-grid">
                        <div className="review-grid-item">
                            <span>Fulfillment Option</span>
                            <strong>
                                {fulfillmentMethod === 'HOME_DELIVERY' 
                                    ? `Hostel/Room Delivery (${deliveryType})` 
                                    : fulfillmentMethod === 'RECORD_PICKUP'
                                        ? `Record Pickup (${recordDeliveryOption === 'DELIVERY' ? `Hostel/Room Delivery - ${deliveryType}` : 'Self Pickup from Shop'})`
                                        : 'Self Pickup from Shop'
                                }
                            </strong>
                        </div>
                        {((fulfillmentMethod === 'HOME_DELIVERY') || (fulfillmentMethod === 'RECORD_PICKUP' && recordDeliveryOption === 'DELIVERY')) && (
                            <>
                                <div className="review-grid-item" style={{ gridColumn: '1 / -1' }}>
                                    <span>Delivery Address</span>
                                    <strong>{serviceType === 'RECORD' ? recordDeliveryAddress : deliveryAddress}</strong>
                                </div>
                                {!((deliveryType === 'EXPRESS' && selectedShop?.freeExpressDelivery) || (deliveryType === 'STANDARD' && selectedShop?.freeDelivery)) && (
                                    <div className="review-grid-item">
                                        <span>Delivery Rates Info</span>
                                        <strong>
                                            {(() => {
                                                const currentSlabs = deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges;
                                                return currentSlabs?.length ? currentSlabs.map(s => `${s.from}-${s.to} km: ₹${s.charge}`).join(', ') : 'Free / Shop Standard';
                                            })()}
                                        </strong>
                                    </div>
                                )}
                            </>
                        )}
                        {serviceType === 'RECORD' && (
                            <>
                                <div className="review-grid-item">
                                    <span>Record Pickup Location</span>
                                    <strong>{recordPickupLocation}</strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Record Pickup Time</span>
                                    <strong>{new Date(recordPickupTime).toLocaleString()}</strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Record Binding Type</span>
                                    <strong>{recordBindingType === 'SPIRAL' ? 'Spiral Binding' : 'Book Binding'}</strong>
                                </div>
                                <div className="review-grid-item">
                                    <span>Front Cover Color</span>
                                    <strong>{recordCoverColor || 'Transparent'}</strong>
                                </div>
                            </>
                        )}
                        <div className="review-grid-item">
                            <span>Phone Number</span>
                            <strong>{customerContact}</strong>
                        </div>
                        <div className="review-grid-item">
                            <span>Email Address</span>
                            <strong>{customerEmail}</strong>
                        </div>
                        <div className="review-grid-item">
                            <span>Intended Payment Method</span>
                            <strong>
                                {paymentType === 'UPI' && '📱 UPI Payment'}
                                {paymentType === 'ONLINE' && '💳 Online Payment'}
                                {paymentType === 'COD' && '💵 Cash on Delivery (COD)'}
                            </strong>
                        </div>
                        <div className="review-grid-item">
                            <span>Deadline Needed By</span>
                            <strong>{new Date(requiredBy).toLocaleString()}</strong>
                        </div>
                    </div>
                    
                    {instructions && (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Special Instructions</small>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{instructions}</span>
                        </div>
                    )}
                </div>

                {/* C. Documents and Printing Config details */}
                <div className="review-section">
                    <h3>Uploaded Documents ({files.length})</h3>
                    <div className="review-doc-list">
                        {files.map((fileObj, idx) => {
                            const fileName = fileObj.file?.name || fileObj.name || 'Document';
                            const fileSize = fileObj.file?.size || fileObj.size || 0;
                            const isPdf = fileName.toLowerCase().endsWith('.pdf');
                            return (
                                <div key={idx} className="review-doc-card">
                                    <div className="review-doc-details">
                                        <strong style={{ fontSize: '0.95rem', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            {isPdf ? '📕' : '🖼️'}{' '}
                                            {fileObj.status === 'success' && fileObj.metadata?.url ? (
                                                <a 
                                                    href={fileObj.metadata.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ textDecoration: 'underline', color: 'inherit', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                                >
                                                    {fileName} ↗
                                                </a>
                                            ) : (
                                                fileName
                                            )}
                                        </strong>
                                        <div style={{ marginTop: '0.25rem' }}>
                                            <PageDetailsSummary doc={fileObj} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {(fileSize / (1024 * 1024)).toFixed(2)} MB
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* D. Pricing & Costs Table */}
                <div className="review-section">
                    <OrderPriceSummary isSidebar={false} />
                </div>

                {/* Bottom checkout buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem' }}>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.85rem 1.5rem', fontWeight: 600 }}
                        onClick={() => navigate('/place-order/order-details')}
                        disabled={loading}
                    >
                        ← Back &amp; Edit
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0.85rem 2rem', fontWeight: 600 }}
                        onClick={handlePlaceOrderSubmit}
                        disabled={loading || !isAllFilesValid}
                    >
                        {loading ? <div className="spinner"></div> : 'Place Order →'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StepReview;
