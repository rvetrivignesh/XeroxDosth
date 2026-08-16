import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import * as shopService from '../services/shop.service.js';

export const applyForShop = asyncHandler(async (req, res) => {
    const data = await shopService.applyForShop(req.user._id, req.body);
    return res
        .status(201)
        .json(new ApiResponse(201, data, "Shop application submitted successfully"));
});

export const getMyShopApplication = asyncHandler(async (req, res) => {
    const data = await shopService.getMyShopApplication(req.user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Shop application retrieved successfully"));
});

export const updateMyShopDetails = asyncHandler(async (req, res) => {
    const data = await shopService.updateMyShopDetails(req.user._id, req.body);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Shop details updated successfully"));
});

export const getApprovedShops = asyncHandler(async (req, res) => {
    const data = await shopService.getAllApprovedShops();
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Approved shops retrieved successfully"));
});

export const getAllShopsAdmin = asyncHandler(async (req, res) => {
    const data = await shopService.getAllShops();
    return res
        .status(200)
        .json(new ApiResponse(200, data, "All shops retrieved successfully"));
});

export const updateShopStatusAdmin = asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body;
    const data = await shopService.updateShopStatus(req.user._id, req.params.id, status, rejectionReason);
    return res
        .status(200)
        .json(new ApiResponse(200, data, `Shop status updated to ${status}`));
});

export const searchUserForPromotion = asyncHandler(async (req, res) => {
    const { email } = req.query;
    if (!email) {
        throw new ApiError(400, "Email query parameter is required");
    }
    const data = await shopService.searchUserByEmail(email);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "User found successfully"));
});

export const promoteUserToShopAdmin = asyncHandler(async (req, res) => {
    const data = await shopService.promoteUserToShop(req.user._id, req.body);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "User promoted to shop owner successfully"));
});

