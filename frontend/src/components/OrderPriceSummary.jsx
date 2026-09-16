import React from 'react';
import { useOrder } from '../context/OrderContext';

export const OrderPriceSummary = ({ isSidebar = true }) => {
    const { 
        priceDetails, 
        rates, 
        selectedShop, 
        serviceType, 
        fulfillmentMethod, 
        deliveryType, 
        recordDeliveryOption,
        files 
    } = useOrder();

    const isDelivery = (serviceType === 'DELIVERY') || 
                       (serviceType === 'RECORD' && recordDeliveryOption === 'DELIVERY') ||
                       (fulfillmentMethod === 'HOME_DELIVERY');

    let printTypeLabel = 'Grayscale';
    if (priceDetails.hasColor) {
        if (priceDetails.singleBwSheetsTotal > 0 || priceDetails.doubleBwSheetsTotal > 0) {
            printTypeLabel = 'Mixed (Color & Grayscale)';
        } else {
            printTypeLabel = 'Color';
        }
    }

    const { bwSingleRate = 0, bwDoubleRate = 0, colourSingleRate = 0, colourDoubleRate = 0 } = rates;

    return (
        <div className={`summary-sidebar card ${isSidebar ? '' : 'summary-full-width'}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Price Summary</h3>
                {selectedShop && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {selectedShop.shopName}
                    </span>
                )}
            </div>
            <hr style={{ margin: '0 0 1rem 0', borderColor: 'var(--border-color)' }} />
            
            <div className="review-cost-table" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Pages</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{priceDetails.totalPages}</strong>
                </div>

                <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Print Type</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{printTypeLabel}</strong>
                </div>

                <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Print Side</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{priceDetails.printSideStr}</strong>
                </div>

                <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Physical Sheets</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{priceDetails.bwSheets + priceDetails.colorSheets}</strong>
                </div>

                {priceDetails.singleBwSheetsTotal > 0 && (
                    <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Single-Sided Grayscale</span>
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {priceDetails.singleBwSheetsTotal} page(s) × ₹{bwSingleRate.toFixed(2)}
                            </small>
                        </div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            ₹{(priceDetails.singleBwSheetsTotal * bwSingleRate).toFixed(2)}
                        </strong>
                    </div>
                )}

                {priceDetails.doubleBwSheetsTotal > 0 && (
                    <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Double-Sided Grayscale</span>
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {priceDetails.doubleBwSheetsTotal * 2} page(s) → {priceDetails.doubleBwSheetsTotal} sheet(s) × ₹{bwDoubleRate.toFixed(2)}
                            </small>
                        </div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            ₹{(priceDetails.doubleBwSheetsTotal * bwDoubleRate).toFixed(2)}
                        </strong>
                    </div>
                )}

                {priceDetails.singleColourSheetsTotal > 0 && (
                    <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Single-Sided Color</span>
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {priceDetails.singleColourSheetsTotal} page(s) × ₹{colourSingleRate.toFixed(2)}
                            </small>
                        </div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            ₹{(priceDetails.singleColourSheetsTotal * colourSingleRate).toFixed(2)}
                        </strong>
                    </div>
                )}

                {priceDetails.doubleColourSheetsTotal > 0 && (
                    <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Double-Sided Color</span>
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {priceDetails.doubleColourSheetsTotal * 2} page(s) → {priceDetails.doubleColourSheetsTotal} sheet(s) × ₹{colourDoubleRate.toFixed(2)}
                            </small>
                        </div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            ₹{(priceDetails.doubleColourSheetsTotal * colourDoubleRate).toFixed(2)}
                        </strong>
                    </div>
                )}

                {priceDetails.bindingCost > 0 && (
                    <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Binding</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            ₹{priceDetails.bindingCost.toFixed(2)}
                        </strong>
                    </div>
                )}

                {isDelivery && (
                    <div className="review-cost-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Delivery ({deliveryType === 'EXPRESS' ? 'Express' : 'Standard'})
                        </span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {priceDetails.deliveryCharge > 0 ? `₹${priceDetails.deliveryCharge.toFixed(2)}` : 'Free'}
                        </strong>
                    </div>
                )}

                <div className="summary-price-box" style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Estimated Cost</span>
                    <div className="price-tag" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                        ₹{priceDetails.total.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderPriceSummary;
