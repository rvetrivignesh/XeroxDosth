import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as orderService from '../services/order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.user._id, req.body, req.app.get('io'));
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
    const order = await orderService.updateOrderStatus(req.user._id, req.params.id, status, paymentStatus, req.app.get('io'));
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

export const acceptOrder = asyncHandler(async (req, res) => {
    const order = await orderService.acceptOrder(req.user._id, req.params.id, req.body, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Order accepted successfully'));
});

export const rejectOrder = asyncHandler(async (req, res) => {
    const order = await orderService.rejectOrder(req.user._id, req.params.id, req.body, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Order rejected successfully'));
});

export const cancelOrder = asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(req.user._id, req.params.id, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Order cancelled successfully'));
});

export const requestCancellation = asyncHandler(async (req, res) => {
    const order = await orderService.requestCancellation(req.user._id, req.params.id, req.body, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Cancellation request submitted'));
});

export const approveCancellation = asyncHandler(async (req, res) => {
    const order = await orderService.approveCancellation(req.user._id, req.params.id, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Cancellation approved successfully'));
});

export const rejectCancellation = asyncHandler(async (req, res) => {
    const order = await orderService.rejectCancellation(req.user._id, req.params.id, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Cancellation rejected successfully'));
});

export const payOrder = asyncHandler(async (req, res) => {
    const order = await orderService.payOrder(req.user._id, req.params.id, req.body, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Payment / COD confirmation submitted'));
});

export const requestPaymentAgain = asyncHandler(async (req, res) => {
    const order = await orderService.requestPaymentAgain(req.user._id, req.params.id, req.body, req.app.get('io'));
    return res
        .status(200)
        .json(new ApiResponse(200, order, 'Payment requested again successfully'));
});
