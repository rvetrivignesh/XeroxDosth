import React from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { OrderProvider, useOrder } from '../context/OrderContext';
import './Order.css';

const StepRoutes = [
    { step: 1, path: '/place-order/service', label: 'Service' },
    { step: 2, path: '/place-order/shop', label: 'Shop' },
    { step: 3, path: '/place-order/configure-files', label: 'Configure Files' },
    { step: 4, path: '/place-order/order-details', label: 'Order Details' },
    { step: 5, path: '/place-order/review', label: 'Review' }
];

const PlaceOrderShell = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { serviceType } = useOrder();

    const currentPath = location.pathname;
    const currentStepObj = StepRoutes.find(r => r.path === currentPath) || StepRoutes[0];
    const currentStepNum = currentStepObj.step;

    const dynamicLabels = [
        'Service',
        'Shop',
        serviceType === 'RECORD' ? 'Print Details' : 'Configure Files',
        serviceType === 'RECORD' ? 'Fulfillment' : 'Order Details',
        'Review'
    ];

    const currentLabel = dynamicLabels[currentStepNum - 1] || 'Order';

    return (
        <div className="order-wizard-page">
            {/* Desktop Stepper */}
            <div className="stepper-indicator desktop-only-stepper">
                {StepRoutes.map((route, idx) => {
                    const stepNum = route.step;
                    const isActive = currentStepNum >= stepNum;
                    const isCompleted = currentStepNum > stepNum;
                    const label = dynamicLabels[idx];

                    return (
                        <React.Fragment key={stepNum}>
                            <button
                                type="button"
                                className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => {
                                    if (stepNum < currentStepNum) {
                                        navigate(route.path);
                                    }
                                }}
                                disabled={stepNum >= currentStepNum}
                                style={{ cursor: stepNum < currentStepNum ? 'pointer' : 'default' }}
                            >
                                <span className="step-number">{isCompleted ? '✓' : stepNum}</span>
                                <span className="step-label">{label}</span>
                            </button>
                            {idx < StepRoutes.length - 1 && <div className="step-line"></div>}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Mobile Compact Stepper Pill */}
            <div className="mobile-stepper-pill">
                <div className="mobile-stepper-header">
                    <span className="mobile-stepper-badge">Step {currentStepNum} of 5</span>
                    <span className="mobile-stepper-title">{currentLabel}</span>
                </div>
                <div className="mobile-stepper-progress-track">
                    <div 
                        className="mobile-stepper-progress-fill" 
                        style={{ width: `${(currentStepNum / 5) * 100}%` }}
                    />
                </div>
            </div>

            {/* Render Active Step Route */}
            <Outlet />
        </div>
    );
};

export const PlaceOrder = () => {
    return (
        <OrderProvider>
            <PlaceOrderShell />
        </OrderProvider>
    );
};

export default PlaceOrder;
