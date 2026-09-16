import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext';

export const StepShop = () => {
    const { 
        filteredShops, 
        loadingShops, 
        shopSearch, 
        setShopSearch, 
        setShopId, 
        setSelectedShop 
    } = useOrder();
    const navigate = useNavigate();

    const handleSelectShop = (shop) => {
        setShopId(shop._id);
        setSelectedShop(shop);
        navigate('/place-order/configure-files');
    };

    return (
        <div className="step-container shop-selection-step fade-in">
            <div className="step-header">
                <h2>Select Xerox Shop</h2>
                <p>Showing approved print shops near your location.</p>
            </div>

            <div className="search-filter-row">
                <input 
                    type="text" 
                    placeholder="🔍 Search shop name or location..." 
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    className="shop-search-input"
                />
            </div>

            {loadingShops ? (
                <div className="skeleton-container">
                    <div className="skeleton-card"></div>
                    <div className="skeleton-card"></div>
                </div>
            ) : filteredShops.length > 0 ? (
                <div className="shop-list">
                    {filteredShops.map((s) => {
                        const bwRate = s.printingRates?.bwSingle ?? s.pricing?.bwPerPage ?? 0;
                        const colorRate = s.printingRates?.colourSingle ?? s.pricing?.colorPerPage ?? 0;

                        return (
                            <div key={s._id} className="shop-list-card">
                                <div className="shop-card-main">
                                    <h3>{s.shopName}</h3>
                                    <p className="shop-location-text">📍 {s.location?.address}</p>

                                    <div className="shop-badges">
                                        <span className="badge">Grayscale: ₹{bwRate}/pg</span>
                                        <span className="badge">Color (Single Side): ₹{colorRate}/pg</span>
                                        {s.isDeliveryAvailable && <span className="badge delivery-badge">Delivery Available</span>}
                                    </div>
                                </div>
                                <div className="shop-card-actions">
                                    <button 
                                        type="button" 
                                        className="btn btn-primary"
                                        onClick={() => handleSelectShop(s)}
                                    >
                                        Select Shop
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state text-center">
                    <p>No shops found matching your search criteria.</p>
                </div>
            )}

            <div className="navigation-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/place-order/service')}>
                    ← Back to Step 1
                </button>
            </div>
        </div>
    );
};

export default StepShop;
