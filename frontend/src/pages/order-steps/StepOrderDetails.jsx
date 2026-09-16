import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext';
import OrderPriceSummary from '../../components/OrderPriceSummary';

export const StepOrderDetails = () => {
    const {
        serviceType,
        selectedShop,
        fulfillmentMethod,
        deliveryType,
        setDeliveryType,
        deliveryAddress,
        setDeliveryAddress,
        recordDeliveryOption,
        setRecordDeliveryOption,
        recordDeliveryAddress,
        setRecordDeliveryAddress,
        customerContact,
        setCustomerContact,
        customerEmail,
        setCustomerEmail,
        paymentType,
        setPaymentType,
        requiredBy,
        setRequiredBy
    } = useOrder();

    const navigate = useNavigate();

    const isDelivery = (serviceType === 'DELIVERY') || 
                       (serviceType === 'RECORD' && recordDeliveryOption === 'DELIVERY');

    const isContinueDisabled = 
        !customerContact.trim() || 
        customerContact.length !== 10 ||
        !customerEmail.trim() ||
        new Date(requiredBy) <= new Date() ||
        (isDelivery && (
            !(serviceType === 'RECORD' ? recordDeliveryAddress.trim() : deliveryAddress.trim()) ||
            (((deliveryType === 'EXPRESS' && !selectedShop?.freeExpressDelivery) || (deliveryType === 'STANDARD' && !selectedShop?.freeDelivery)) && (
                !(deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges)?.length
            ))
        ));

    return (
        <div className="step-container specs-step fade-in">
            <div className="step-header">
                <h2>
                    {serviceType === 'RECORD' ? 'Step 2 — Pickup / Delivery' : 'Order Details & Fulfillment'}
                </h2>
                <p>Complete your contact and delivery preferences.</p>
            </div>

            <div className="specs-layout-grid">
                <div className="specs-form-container card" style={{ padding: '1.5rem' }}>
                    {/* Fulfillment method display / selection */}
                    {serviceType === 'RECORD' ? (
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="recordDeliveryOption">Fulfillment Method *</label>
                                <select 
                                    id="recordDeliveryOption" 
                                    value={recordDeliveryOption} 
                                    onChange={(e) => setRecordDeliveryOption(e.target.value)}
                                >
                                    <option value="PICKUP">Self Pickup from Shop</option>
                                    <option value="DELIVERY">Delivery to Location</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Fulfillment Method</label>
                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                                    {fulfillmentMethod === 'HOME_DELIVERY' ? '🚚 Home Delivery' : '🏪 Shop Pickup'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delivery Type & Distance Slab (if delivery is selected) */}
                    {isDelivery && (
                        <>
                            {/* Delivery Address block */}
                            <div className="form-group">
                                <label htmlFor="deliveryAddressInput">Hostel / Room Delivery Address *</label>
                                <textarea
                                    id="deliveryAddressInput"
                                    rows={2}
                                    placeholder="Specify hostel block, room number, floor..."
                                    value={serviceType === 'RECORD' ? recordDeliveryAddress : deliveryAddress}
                                    onChange={(e) => {
                                        if (serviceType === 'RECORD') {
                                            setRecordDeliveryAddress(e.target.value);
                                        } else {
                                            setDeliveryAddress(e.target.value);
                                        }
                                    }}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="deliveryType">Delivery Option *</label>
                                    <select
                                        id="deliveryType"
                                        value={deliveryType}
                                        onChange={(e) => setDeliveryType(e.target.value)}
                                    >
                                        {selectedShop?.homeDelivery && <option value="STANDARD">Standard Delivery</option>}
                                        {selectedShop?.expressPrinting && <option value="EXPRESS">Express Delivery</option>}
                                    </select>
                                </div>
                                
                                {/* Delivery Pricing Slabs Display */}
                                {((deliveryType === 'EXPRESS' && !selectedShop?.freeExpressDelivery) || 
                                  (deliveryType === 'STANDARD' && !selectedShop?.freeDelivery)) ? (
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label>Delivery Rate Slabs (Shop Pricing)</label>
                                        {((deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges)?.length > 0) ? (
                                            <div style={{
                                                padding: '0.85rem 1rem',
                                                backgroundColor: 'var(--bg-hover)',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--border-color)',
                                                fontSize: '0.88rem'
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span>{deliveryType === 'EXPRESS' ? '⚡ Express Delivery Charges' : '🚚 Standard Delivery Charges'}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {(deliveryType === 'EXPRESS' ? selectedShop?.expressDeliveryCharges : selectedShop?.deliveryCharges)?.map((slab, idx) => (
                                                        <div key={idx} style={{
                                                            padding: '0.4rem 0.75rem',
                                                            backgroundColor: 'var(--bg-card)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: 'var(--radius-xs)',
                                                            fontSize: '0.82rem',
                                                            fontWeight: 500
                                                        }}>
                                                            {slab.from} - {slab.to} KM: <strong>₹{slab.charge}</strong>
                                                        </div>
                                                    ))}
                                                </div>
                                                <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                                    ℹ️ Delivery charge will be finalized by shop based on actual address distance.
                                                </small>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600 }}>
                                                ⚠️ No pricing slabs configured by shop
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label>Delivery Cost</label>
                                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--success-color)', fontWeight: 600 }}>
                                            🆓 Free Delivery Included
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Contact Details */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="customerContact">Your Phone Number *</label>
                            <input
                                id="customerContact"
                                type="tel"
                                placeholder="10-digit number"
                                value={customerContact}
                                onChange={(e) => setCustomerContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                required
                                maxLength={10}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="customerEmail">Your Email Address *</label>
                            <input
                                id="customerEmail"
                                type="email"
                                placeholder="Enter email address"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="paymentType">Intended Payment Method *</label>
                            <select
                                id="paymentType"
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                            >
                                <option value="UPI">📱 UPI Payment</option>
                                {selectedShop?.isCodAvailable && <option value="COD">💵 Cash on Delivery (COD)</option>}
                            </select>
                            <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                                Note: You will pay after the shop reviews and accepts the order.
                            </small>
                        </div>
                    </div>

                    {/* Deadline Picker */}
                    <div className="form-row">
                        <div className="form-group deadline-row-full">
                            <label htmlFor="requiredBy">Required Completion Deadline *</label>
                            <input
                                id="requiredBy"
                                type="datetime-local"
                                value={requiredBy}
                                onChange={(e) => setRequiredBy(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="specs-actions" style={{ marginTop: '2rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/place-order/configure-files')}>
                            ← Back
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={() => navigate('/place-order/review')}
                            disabled={isContinueDisabled}
                        >
                            Continue to Review →
                        </button>
                    </div>
                </div>

                {/* Price summary sidebar */}
                <div className="summary-sidebar-container">
                    <OrderPriceSummary isSidebar={true} />
                </div>
            </div>
        </div>
    );
};

export default StepOrderDetails;
