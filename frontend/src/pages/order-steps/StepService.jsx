import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext';

export const StepService = () => {
    const { setServiceType } = useOrder();
    const navigate = useNavigate();

    const handleSelectService = (type) => {
        setServiceType(type);
        navigate('/place-order/shop');
    };

    return (
        <div className="step-container service-step fade-in">
            <div className="step-header text-center" style={{ marginBottom: '2.5rem' }}>
                <h1>Select Xerox Service</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Choose how you want to print or bind your documents.</p>
            </div>

            <div className="service-cards-grid">
                <div 
                    className="service-card"
                    onClick={() => handleSelectService('DELIVERY')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectService('DELIVERY'); }}
                >
                    <div className="service-icon">🚚</div>
                    <h3>Home Delivery</h3>
                    <p>Upload documents and get them printed and delivered straight to your hostel or room.</p>
                    <button type="button" className="btn btn-secondary btn-sm">Select Service</button>
                </div>

                <div 
                    className="service-card"
                    onClick={() => handleSelectService('RECORD')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectService('RECORD'); }}
                >
                    <div className="service-icon">📘</div>
                    <h3>Record Pickup & Binding</h3>
                    <p>Submit written logs. We will collect them, print remaining PDF sheets, bind them, and deliver.</p>
                    <button type="button" className="btn btn-secondary btn-sm">Select Service</button>
                </div>
            </div>
        </div>
    );
};

export default StepService;
