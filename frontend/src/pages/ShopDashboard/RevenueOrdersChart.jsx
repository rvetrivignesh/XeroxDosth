import React, { useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { formatCurrency, formatNumber } from './StatCard';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{label}</p>
                {payload.map((entry, index) => (
                    <p key={`item-${index}`} style={{ color: entry.color, margin: '4px 0', fontSize: '0.875rem' }}>
                        <strong>{entry.name}:</strong>{' '}
                        {entry.name === 'Revenue' ? formatCurrency(entry.value) : formatNumber(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const RevenueOrdersChart = ({ data = [] }) => {
    const [metricFilter, setMetricFilter] = useState('both'); // 'both', 'orders', 'revenue'

    const showOrders = metricFilter === 'both' || metricFilter === 'orders';
    const showRevenue = metricFilter === 'both' || metricFilter === 'revenue';

    return (
        <div className="chart-card card">
            <div className="chart-card-header">
                <div className="chart-title-container">
                    <h3>Revenue & Orders Trend</h3>
                    <p className="chart-subtitle">Track shop order volume and financial revenue progression</p>
                </div>

                <div className="metric-toggle-group">
                    <button
                        className={`toggle-btn ${metricFilter === 'both' ? 'active' : ''}`}
                        onClick={() => setMetricFilter('both')}
                    >
                        Orders & Revenue
                    </button>
                    <button
                        className={`toggle-btn ${metricFilter === 'orders' ? 'active' : ''}`}
                        onClick={() => setMetricFilter('orders')}
                    >
                        Orders Only
                    </button>
                    <button
                        className={`toggle-btn ${metricFilter === 'revenue' ? 'active' : ''}`}
                        onClick={() => setMetricFilter('revenue')}
                    >
                        Revenue Only
                    </button>
                </div>
            </div>

            <div className="chart-body" style={{ width: '100%', height: 320, marginTop: '1rem' }}>
                {data.length === 0 ? (
                    <div className="empty-chart-placeholder">
                        <p>No trend data recorded for the selected date range.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e2e8f0)" opacity={0.5} />
                            <XAxis
                                dataKey="date"
                                stroke="var(--text-secondary, #64748b)"
                                fontSize={12}
                                tickLine={false}
                            />
                            {showOrders && (
                                <YAxis
                                    yAxisId="ordersAxis"
                                    orientation="left"
                                    stroke="#6366f1"
                                    fontSize={12}
                                    tickLine={false}
                                    tickFormatter={(val) => formatNumber(val)}
                                />
                            )}
                            {showRevenue && (
                                <YAxis
                                    yAxisId="revenueAxis"
                                    orientation={showOrders ? 'right' : 'left'}
                                    stroke="#10b981"
                                    fontSize={12}
                                    tickLine={false}
                                    tickFormatter={(val) => `₹${val}`}
                                />
                            )}
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: 10 }} />

                            {showOrders && (
                                <Line
                                    yAxisId="ordersAxis"
                                    type="monotone"
                                    dataKey="orders"
                                    name="Orders"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#6366f1' }}
                                    activeDot={{ r: 7 }}
                                />
                            )}

                            {showRevenue && (
                                <Line
                                    yAxisId="revenueAxis"
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Revenue"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#10b981' }}
                                    activeDot={{ r: 7 }}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default RevenueOrdersChart;
