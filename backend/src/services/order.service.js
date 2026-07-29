import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import User from '../models/users/user.model.js';
import ApiError from '../utils/ApiError.js';

export const createOrder = async (userId, orderData) => {
    // Verify that target shop exists
    const shop = await Shop.findById(orderData.shop);
    if (!shop) {
        throw new ApiError(404, 'Shop not found');
    }

    const bwPages = Number(orderData.bwPages || 0);
    const colorPages = Number(orderData.colorPages || 0);
    const totalPages = bwPages + colorPages;

    if (totalPages < 1) {
        throw new ApiError(400, 'Order must contain at least 1 page');
    }

    const order = await Order.create({
        customer: userId,
        shop: orderData.shop,
        documents: orderData.documents,
        bwPages,
        colorPages,
        totalPages,
        copies: orderData.copies || 1,
        printSide: orderData.printSide,
        binding: orderData.binding,
        fulfillmentType: orderData.fulfillmentType || 'PICKUP',
        deliveryAddress: orderData.deliveryAddress || '',
        requiredBy: orderData.requiredBy,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: 'UNPAID',
        instructions: orderData.instructions || '',
        transactionId: orderData.transactionId || '',
        customerContact: orderData.customerContact || '',
        status: 'PENDING'
    });

    return order;
};

export const getUserOrders = async (userId) => {
    const orders = await Order.find({ customer: userId })
        .sort({ createdAt: -1 })
        .populate('shop', 'shopName location phone email upiId');

    return orders;
};

export const getShopOrders = async (userId) => {
    // Find the shop owned by this user
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const orders = await Order.find({ shop: shop._id })
        .sort({ createdAt: -1 })
        .populate('customer', 'name email phone');

    return orders;
};

export const updateOrderStatus = async (userId, orderId, status, paymentStatus) => {
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
        throw new ApiError(404, 'No shop registered for this user');
    }

    const order = await Order.findOne({ _id: orderId, shop: shop._id });
    if (!order) {
        throw new ApiError(404, 'Order not found for your shop');
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    await order.save();
    return order;
};

export const getOrderById = async (userId, orderId) => {
    const order = await Order.findById(orderId)
        .populate('shop')
        .populate('customer', 'name email phone');

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    const requestingUser = await User.findById(userId);
    if (!requestingUser) {
        throw new ApiError(404, 'User not found');
    }

    const isCustomer = order.customer._id.toString() === userId.toString();
    const isShopOwner = order.shop?.owner?.toString() === userId.toString();
    const isAdmin = requestingUser.role === 'ADMIN';

    if (!isCustomer && !isShopOwner && !isAdmin) {
        throw new ApiError(403, 'Not authorized to access this order');
    }

    return order;
};

