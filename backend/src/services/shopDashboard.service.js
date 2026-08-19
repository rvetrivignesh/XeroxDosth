import mongoose from 'mongoose';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';

/**
 * Utility to calculate percentage change between current and previous values
 */
const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? null : 0; // null signifies "New" or no baseline
    }
    const change = ((current - previous) / previous) * 100;
    return Number(change.toFixed(1));
};

/**
 * Format date labels cleanly for chart points
 */
const formatDateLabel = (dateObj, granularity) => {
    const d = new Date(dateObj);
    if (granularity === 'hourly') {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    } else if (granularity === 'monthly') {
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Generate date range boundaries and previous period range
 */
const getRangeBoundaries = (range, startDateQuery, endDateQuery) => {
    const now = new Date();
    let currentStart = new Date();
    let currentEnd = new Date(now);
    let prevStart = new Date();
    let prevEnd = new Date();
    let granularity = 'daily';

    switch (range) {
        case 'today': {
            granularity = 'hourly';
            currentStart.setHours(0, 0, 0, 0);
            currentEnd.setHours(23, 59, 59, 999);

            prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - 1);
            prevEnd = new Date(currentEnd);
            prevEnd.setDate(prevEnd.getDate() - 1);
            break;
        }
        case '7d': {
            granularity = 'daily';
            currentStart.setDate(now.getDate() - 6);
            currentStart.setHours(0, 0, 0, 0);

            prevEnd = new Date(currentStart);
            prevEnd.setMilliseconds(-1);
            prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - 7);
            break;
        }
        case 'this_month': {
            granularity = 'daily';
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

            // Previous month
            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            prevEnd = new Date(currentStart);
            prevEnd.setMilliseconds(-1);
            break;
        }
        case '3m': {
            granularity = 'daily';
            currentStart.setDate(now.getDate() - 89);
            currentStart.setHours(0, 0, 0, 0);

            prevEnd = new Date(currentStart);
            prevEnd.setMilliseconds(-1);
            prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - 90);
            break;
        }
        case 'this_year': {
            granularity = 'monthly';
            currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

            prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
            prevEnd = new Date(currentStart);
            prevEnd.setMilliseconds(-1);
            break;
        }
        case 'all': {
            granularity = 'monthly';
            currentStart = new Date(2020, 0, 1, 0, 0, 0, 0);
            prevStart = null;
            prevEnd = null;
            break;
        }
        case 'custom': {
            granularity = 'daily';
            if (startDateQuery) currentStart = new Date(startDateQuery);
            if (endDateQuery) {
                currentEnd = new Date(endDateQuery);
                currentEnd.setHours(23, 59, 59, 999);
            }
            const durationMs = currentEnd.getTime() - currentStart.getTime();
            prevEnd = new Date(currentStart.getTime() - 1);
            prevStart = new Date(prevEnd.getTime() - durationMs);
            break;
        }
        case '30d':
        default: {
            granularity = 'daily';
            currentStart.setDate(now.getDate() - 29);
            currentStart.setHours(0, 0, 0, 0);

            prevEnd = new Date(currentStart);
            prevEnd.setMilliseconds(-1);
            prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - 30);
            break;
        }
    }

    return { currentStart, currentEnd, prevStart, prevEnd, granularity };
};

export const getShopDashboardData = async (userId, query) => {
    // 1. Authenticate & fetch Shop owned by userId
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, "No shop registered for this user");
    }

    const shopId = shop._id;
    const { range = '30d', startDate, endDate } = query;
    const { currentStart, currentEnd, prevStart, prevEnd, granularity } = getRangeBoundaries(range, startDate, endDate);

    // 2. Fetch current period metrics via Mongo Aggregation
    const currentStatsAgg = await Order.aggregate([
        {
            $match: {
                shop: shopId,
                createdAt: { $gte: currentStart, $lte: currentEnd }
            }
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: {
                    $sum: { $ifNull: ["$totalAmount", { $ifNull: ["$finalPrice", 0] }] }
                },
                completedOrders: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0]
                    }
                }
            }
        }
    ]);

    const currentStats = currentStatsAgg[0] || { totalOrders: 0, totalRevenue: 0, completedOrders: 0 };

    const totalOrders = currentStats.totalOrders;
    const totalRevenue = Number(currentStats.totalRevenue.toFixed(2));
    const averageOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
    const completedOrders = currentStats.completedOrders;
    const completionRate = totalOrders > 0 ? Number(((completedOrders / totalOrders) * 100).toFixed(1)) : 0;

    // 3. Fetch previous period metrics (for comparison)
    let comparison = {
        ordersChange: null,
        revenueChange: null,
        averageOrderValueChange: null,
        completionRateChange: null
    };

    if (prevStart && prevEnd) {
        const prevStatsAgg = await Order.aggregate([
            {
                $match: {
                    shop: shopId,
                    createdAt: { $gte: prevStart, $lte: prevEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: {
                        $sum: { $ifNull: ["$totalAmount", { $ifNull: ["$finalPrice", 0] }] }
                    },
                    completedOrders: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const prevStats = prevStatsAgg[0] || { totalOrders: 0, totalRevenue: 0, completedOrders: 0 };
        const prevTotalOrders = prevStats.totalOrders;
        const prevTotalRevenue = prevStats.totalRevenue;
        const prevAOV = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
        const prevCompletionRate = prevTotalOrders > 0 ? (prevStats.completedOrders / prevTotalOrders) * 100 : 0;

        comparison = {
            ordersChange: calculatePercentageChange(totalOrders, prevTotalOrders),
            revenueChange: calculatePercentageChange(totalRevenue, prevTotalRevenue),
            averageOrderValueChange: calculatePercentageChange(averageOrderValue, prevAOV),
            completionRateChange: calculatePercentageChange(completionRate, prevCompletionRate)
        };
    }

    // 4. Fetch Trend Line Chart Data
    let trendGroupFormat = {};
    if (granularity === 'hourly') {
        trendGroupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" }
        };
    } else if (granularity === 'monthly') {
        trendGroupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
        };
    } else {
        trendGroupFormat = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
        };
    }

    const trendAgg = await Order.aggregate([
        {
            $match: {
                shop: shopId,
                createdAt: { $gte: currentStart, $lte: currentEnd }
            }
        },
        {
            $group: {
                _id: trendGroupFormat,
                dateSample: { $first: "$createdAt" },
                orders: { $sum: 1 },
                revenue: {
                    $sum: { $ifNull: ["$totalAmount", { $ifNull: ["$finalPrice", 0] }] }
                }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ]);

    // Build continuous trend array with missing slots filled with 0
    const trendMap = new Map();
    trendAgg.forEach(item => {
        const key = item.dateSample.toISOString();
        trendMap.set(key, { orders: item.orders, revenue: Number(item.revenue.toFixed(2)) });
    });

    const trend = [];
    const stepDate = new Date(currentStart);

    while (stepDate <= currentEnd) {
        let label = '';
        if (granularity === 'hourly') {
            label = stepDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        } else if (granularity === 'monthly') {
            label = stepDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        } else {
            label = stepDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        // Aggregate matching orders for this bucket
        let matchedOrders = 0;
        let matchedRevenue = 0;

        trendAgg.forEach(item => {
            const d = new Date(item.dateSample);
            let isMatch = false;
            if (granularity === 'hourly') {
                isMatch = d.getFullYear() === stepDate.getFullYear() &&
                          d.getMonth() === stepDate.getMonth() &&
                          d.getDate() === stepDate.getDate() &&
                          d.getHours() === stepDate.getHours();
            } else if (granularity === 'monthly') {
                isMatch = d.getFullYear() === stepDate.getFullYear() &&
                          d.getMonth() === stepDate.getMonth();
            } else {
                isMatch = d.getFullYear() === stepDate.getFullYear() &&
                          d.getMonth() === stepDate.getMonth() &&
                          d.getDate() === stepDate.getDate();
            }

            if (isMatch) {
                matchedOrders += item.orders;
                matchedRevenue += item.revenue;
            }
        });

        // Avoid adding duplicate monthly/daily labels
        const existingSlot = trend.find(t => t.date === label);
        if (!existingSlot) {
            trend.push({
                date: label,
                orders: matchedOrders,
                revenue: Number(matchedRevenue.toFixed(2))
            });
        }

        // Increment step
        if (granularity === 'hourly') {
            stepDate.setHours(stepDate.getHours() + 1);
        } else if (granularity === 'monthly') {
            stepDate.setMonth(stepDate.getMonth() + 1);
        } else {
            stepDate.setDate(stepDate.getDate() + 1);
        }
    }

    // 5. Orders by Status
    const ordersByStatusAgg = await Order.aggregate([
        {
            $match: {
                shop: shopId,
                createdAt: { $gte: currentStart, $lte: currentEnd }
            }
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        }
    ]);

    const statusMap = {
        COMPLETED: 'Completed',
        IN_PROGRESS: 'In-Print / Active',
        ACCEPTED: 'In-Print / Active',
        PAYMENT_COMPLETED: 'In-Print / Active',
        READY_FOR_PICKUP: 'In-Print / Active',
        OUT_FOR_DELIVERY: 'In-Print / Active',
        PENDING_SHOP_ACCEPTANCE: 'Pending',
        PAYMENT_REQUESTED: 'Pending',
        CANCELLED_BY_USER: 'Cancelled',
        REJECTED_BY_SHOP: 'Cancelled',
        CANCELLED: 'Cancelled',
        CANCELLATION_APPROVED: 'Cancelled'
    };

    const aggregatedStatusCounts = {
        'Completed': 0,
        'In-Print / Active': 0,
        'Pending': 0,
        'Cancelled': 0
    };

    ordersByStatusAgg.forEach(item => {
        const groupLabel = statusMap[item._id] || 'Other';
        if (aggregatedStatusCounts[groupLabel] !== undefined) {
            aggregatedStatusCounts[groupLabel] += item.count;
        } else {
            aggregatedStatusCounts[groupLabel] = item.count;
        }
    });

    const ordersByStatus = Object.keys(aggregatedStatusCounts).map(statusKey => ({
        status: statusKey,
        count: aggregatedStatusCounts[statusKey]
    }));

    // 6. Revenue by Service
    const serviceAgg = await Order.aggregate([
        {
            $match: {
                shop: shopId,
                createdAt: { $gte: currentStart, $lte: currentEnd }
            }
        },
        {
            $group: {
                _id: null,
                printingRevenue: {
                    $sum: {
                        $add: [
                            { $ifNull: ["$bwSubtotal", 0] },
                            { $ifNull: ["$colorSubtotal", 0] }
                        ]
                    }
                },
                bindingRevenue: {
                    $sum: {
                        $cond: [
                            { $ne: ["$binding", "NONE"] },
                            { $ifNull: ["$otherServiceCharges", 0] },
                            0
                        ]
                    }
                },
                deliveryRevenue: {
                    $sum: { $ifNull: ["$deliveryCharge", 0] }
                },
                totalRev: {
                    $sum: { $ifNull: ["$totalAmount", { $ifNull: ["$finalPrice", 0] }] }
                }
            }
        }
    ]);

    const serviceData = serviceAgg[0] || { printingRevenue: 0, bindingRevenue: 0, deliveryRevenue: 0, totalRev: 0 };
    let printing = Number(serviceData.printingRevenue.toFixed(2));
    let binding = Number(serviceData.bindingRevenue.toFixed(2));
    let delivery = Number(serviceData.deliveryRevenue.toFixed(2));
    
    // If breakdown elements are 0 but totalRev > 0 (fallback for legacy order records), assign to Printing
    if (printing === 0 && binding === 0 && delivery === 0 && totalRevenue > 0) {
        printing = totalRevenue;
    }

    const others = Math.max(0, Number((totalRevenue - (printing + binding + delivery)).toFixed(2)));

    const revenueByService = [
        { service: 'Printing', revenue: printing },
        { service: 'Binding', revenue: binding },
        { service: 'Delivery & Others', revenue: delivery + others }
    ];

    return {
        summary: {
            totalOrders,
            totalRevenue,
            averageOrderValue,
            completedOrders,
            completionRate
        },
        comparison,
        trend,
        ordersByStatus,
        revenueByService,
        shopInfo: {
            shopName: shop.shopName,
            status: shop.status
        }
    };
};
