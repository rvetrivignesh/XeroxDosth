import React from 'react';
import { formatCurrency } from './StatCard';

const serviceColors = {
    'Printing': '#6366f1',
    'Binding': '#8b5cf6',
    'Xerox / Photocopy': '#06b6d4',
    'Delivery & Others': '#ec4899'
};

export const RevenueByService = ({ data = [] }) => {
    const totalRev = data.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

    return (
        <div className="service-card card">
            <div className="service-card-header">
                <h3>Revenue by Service</h3>
                <span className="service-total-badge">{formatCurrency(totalRev)}</span>
            </div>

            <div className="service-body">
                {data.length === 0 || totalRev === 0 ? (
                    <div className="empty-widget-placeholder">
                        <p>No service revenue recorded for this period.</p>
                    </div>
                ) : (
                    <div className="service-list">
                        {data.map((item) => {
                            const percent = totalRev > 0 ? ((item.revenue / totalRev) * 100).toFixed(1) : 0;
                            const barColor = serviceColors[item.service] || '#6366f1';

                            return (
                                <div key={item.service} className="service-item">
                                    <div className="service-item-info">
                                        <span className="service-name">
                                            <span className="service-dot" style={{ backgroundColor: barColor }} />
                                            {item.service}
                                        </span>
                                        <span className="service-amount">
                                            <strong>{formatCurrency(item.revenue)}</strong>{' '}
                                            <span className="service-percent">({percent}%)</span>
                                        </span>
                                    </div>

                                    <div className="service-progress-track">
                                        <div
                                            className="service-progress-fill"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: barColor
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RevenueByService;
