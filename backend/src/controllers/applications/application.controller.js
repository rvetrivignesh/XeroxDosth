import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as applicationService from '../../services/applications/application.service.js';

export const submitApplication = asyncHandler(async (req, res) => {
    const data = await applicationService.submitApplication(req.user._id, req.body);
    return res
        .status(201)
        .json(new ApiResponse(201, data, "Application submitted successfully"));
});

export const getMyApplications = asyncHandler(async (req, res) => {
    const data = await applicationService.getUserApplications(req.user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "User applications retrieved successfully"));
});

export const withdrawApplication = asyncHandler(async (req, res) => {
    const data = await applicationService.withdrawApplication(req.user._id, req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Application withdrawn successfully"));
});

export const getAllApplications = asyncHandler(async (req, res) => {
    const data = await applicationService.getAllApplications();
    return res
        .status(200)
        .json(new ApiResponse(200, data, "All applications retrieved successfully"));
});

export const getApplicationById = asyncHandler(async (req, res) => {
    const data = await applicationService.getApplicationById(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Application details retrieved successfully"));
});

export const approveApplication = asyncHandler(async (req, res) => {
    const data = await applicationService.approveApplication(req.user._id, req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Application approved successfully"));
});

export const rejectApplication = asyncHandler(async (req, res) => {
    const { rejectionReason } = req.body;
    const data = await applicationService.rejectApplication(req.user._id, req.params.id, rejectionReason);
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Application rejected successfully"));
});
