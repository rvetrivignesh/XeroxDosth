import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import StatCard from './StatCard';
import RevenueOrdersChart from './RevenueOrdersChart';
import OrdersByStatus from './OrdersByStatus';
import RevenueByService from './RevenueByService';
import './ShopDashboard.css';

export const ShopDashboard = () => {
    const [range, setRange] = useState('7d');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = { range };
            if (range === 'custom' && customStartDate && customEndDate) {
                params.startDate = customStartDate;
                params.endDate = customEndDate;
            }

            const res = await API.get('/shops/dashboard', { params });
            if (res.data?.data) {
                setDashboardData(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching shop dashboard analytics:', err);
            setError(err.response?.data?.message || 'Failed to load shop dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [range]);

    const handleCustomDateSubmit = (e) => {
        e.preventDefault();
        if (customStartDate && customEndDate) {
            fetchDashboard();
        }
    };

    const summary = dashboardData?.summary || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        completionRate: 0
    };

    const comparison = dashboardData?.comparison || {
        ordersChange: 0,
        revenueChange: 0,
        averageOrderValueChange: 0,
        completionRateChange: 0
    };

    const trendData = dashboardData?.trend || [];
    const ordersByStatusData = dashboardData?.ordersByStatus || [];
    const revenueByServiceData = dashboardData?.revenueByService || [];
    const shopInfo = dashboardData?.shopInfo || {};

    return (
        <div className="shop-dashboard-container">
            {/* Header Control Bar */}
            <div className="dashboard-header-bar">
                <div className="header-title-group">
                    <h2>
                        {shopInfo.shopName ? `${shopInfo.shopName} Dashboard` : 'Shop Command Center'}
                    </h2>
                    <p className="header-subtitle">Real-time order metrics, revenue tracking, and service performance</p>
                </div>

                <div className="dashboard-controls">
                    <select
                        className="range-select"
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                    >
                        <option value="today">Today</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="this_year">This Year</option>
                        <option value="all">All Time</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    {range === 'custom' && (
                        <form onSubmit={handleCustomDateSubmit} className="custom-date-inputs">
                            <input
                                type="date"
                                className="date-input"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                required
                            />
                            <span>to</span>
                            <input
                                type="date"
                                className="date-input"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn btn-secondary btn-sm">Apply</button>
                        </form>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="dashboard-error-banner">
                    <span>⚠️ {error}</span>
                    <button className="btn btn-secondary btn-sm" onClick={fetchDashboard}>Try Again</button>
                </div>
            )}

            {/* KPI Cards Section */}
            <div className="kpi-cards-grid">
                {loading ? (
                    <>
                        <div className="stat-card skeleton-shimmer" style={{ height: 130 }} />
                        <div className="stat-card skeleton-shimmer" style={{ height: 130 }} />
                        <div className="stat-card skeleton-shimmer" style={{ height: 130 }} />
                        <div className="stat-card skeleton-shimmer" style={{ height: 130 }} />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="Total Orders"
                            value={summary.totalOrders}
                            change={comparison.ordersChange}
                            icon="🛍️"
                        />
                        <StatCard
                            title="Total Revenue"
                            value={summary.totalRevenue}
                            change={comparison.revenueChange}
                            isCurrency={true}
                            icon="₹"
                        />
                        <StatCard
                            title="Avg. Order Value"
                            value={summary.averageOrderValue}
                            change={comparison.averageOrderValueChange}
                            isCurrency={true}
                            icon="📈"
                        />
                        <StatCard
                            title="Completed Orders"
                            value={summary.completedOrders}
                            change={comparison.completionRateChange}
                            subtitle={`${summary.completionRate}% completion rate`}
                            icon="✅"
                        />
                    </>
                )}
            </div>

            {/* Main Trend Line Chart */}
            {loading ? (
                <div className="chart-card skeleton-shimmer" style={{ height: 380 }} />
            ) : (
                <RevenueOrdersChart data={trendData} />
            )}

            {/* Bottom Widgets Grid */}
            <div className="dashboard-bottom-grid">
                {loading ? (
                    <>
                        <div className="status-card skeleton-shimmer" style={{ height: 260 }} />
                        <div className="service-card skeleton-shimmer" style={{ height: 260 }} />
                    </>
                ) : (
                    <>
                        <OrdersByStatus data={ordersByStatusData} />
                        <RevenueByService data={revenueByServiceData} />
                    </>
                )}
            </div>
        </div>
    );
};

export default ShopDashboard;
