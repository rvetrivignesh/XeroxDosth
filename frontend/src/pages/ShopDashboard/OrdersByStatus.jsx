import React from 'react';
import { formatNumber } from './StatCard';

const statusColors = {
    'Completed': '#10b981',
    'In-Print / Active': '#3b82f6',
    'Pending': '#f59e0b',
    'Cancelled': '#ef4444'
};

export const OrdersByStatus = ({ data = [] }) => {
    const totalCount = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

    return (
        <div className="status-card card">
            <div className="status-card-header">
                <h3>Orders by Status</h3>
                <span className="status-total-badge">{formatNumber(totalCount)} Total</span>
            </div>

            <div className="status-body">
                {data.length === 0 || totalCount === 0 ? (
                    <div className="empty-widget-placeholder">
                        <p>No orders found for status comparison.</p>
                    </div>
                ) : (
                    <div className="status-list">
                        {data.map((item) => {
                            const percent = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : 0;
                            const barColor = statusColors[item.status] || '#64748b';

                            return (
                                <div key={item.status} className="status-item">
                                    <div className="status-item-info">
                                        <span className="status-name">
                                            <span className="status-dot" style={{ backgroundColor: barColor }} />
                                            {item.status}
                                        </span>
                                        <span className="status-count">
                                            <strong>{formatNumber(item.count)}</strong>{' '}
                                            <span className="status-percent">({percent}%)</span>
                                        </span>
                                    </div>

                                    <div className="status-progress-track">
                                        <div
                                            className="status-progress-fill"
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

export default OrdersByStatus;
