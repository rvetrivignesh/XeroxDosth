import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getShopDashboardData } from '../services/shopDashboard.service.js';

export const getShopDashboard = asyncHandler(async (req, res) => {
    const data = await getShopDashboardData(req.user._id, req.query);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Shop dashboard analytics retrieved successfully"));
});
