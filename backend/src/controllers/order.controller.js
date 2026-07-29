import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as orderService from '../services/order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.user._id, req.body);
    return res
        .status(201)
        .json(new ApiResponse(201, order, 'Order placed successfully'));
});

export const getUserOrders = asyncHandler(async (req, res) => {
    const orders = await orderService.getUserOrders(req.user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, orders, 'User orders retrieved successfully'));
});

export const getShopOrders = asyncHandler(async (req, res) => {
    const orders = await orderService.getShopOrders(req.user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, orders, 'Shop orders retrieved successfully'));
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status, paymentStatus } = req.body;
    const order = await orderService.updateOrderStatus(req.user._id, req.params.id, status, paymentStatus);
    return res
        .status(200)
        .json(new ApiResponse(200, order, `Order updated successfully`));
});

export const getOrderById = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(req.user._id, req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Order retrieved successfully'));
});

