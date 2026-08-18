import React from 'react';

/**
 * Utility to format numbers into Indian Currency format e.g. ₹1,84,520
 */
export const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(val);
};

/**
 * Utility to format numbers e.g. 1,284
 */
export const formatNumber = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return new Intl.NumberFormat('en-IN').format(val);
};

export const StatCard = ({ title, value, change, isCurrency = false, isPercentage = false, subtitle = 'vs previous period', icon }) => {
    const isPositive = change > 0;
    const isNegative = change < 0;
    const isNeutral = change === 0 || change === null || change === undefined;

    let formattedValue = value;
    if (isCurrency) {
        formattedValue = formatCurrency(value);
    } else if (isPercentage) {
        formattedValue = `${value}%`;
    } else {
        formattedValue = formatNumber(value);
    }

    return (
        <div className="stat-card card">
            <div className="stat-card-header">
                <span className="stat-card-title">{title}</span>
                {icon && <span className="stat-card-icon">{icon}</span>}
            </div>

            <div className="stat-card-value">{formattedValue}</div>

            <div className="stat-card-footer">
                {!isNeutral ? (
                    <span className={`stat-pill ${isPositive ? 'pill-positive' : 'pill-negative'}`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
                    </span>
                ) : (
                    <span className="stat-pill pill-neutral">
                        — {change === null ? 'New' : '0%'}
                    </span>
                )}
                <span className="stat-subtitle">{subtitle}</span>
            </div>
        </div>
    );
};

export default StatCard;
