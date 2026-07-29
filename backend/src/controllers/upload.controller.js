import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';
import { validateUploadedFile } from '../utils/uploadValidator.js';

/**
 * Handles single file upload, validates file type and size, and uploads to Cloudinary.
 */
export const uploadFile = asyncHandler(async (req, res) => {
    const { file } = req;
    
    const validationError = validateUploadedFile(file);
    if (validationError) {
        throw new ApiError(400, validationError);
    }
    
    // Stream buffer to Cloudinary
    const result = await uploadToCloudinary(file.buffer);
    
    const responseData = {
        publicId: result.public_id,
        url: result.secure_url,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
    };
    
    return res
        .status(200)
        .json(new ApiResponse(200, responseData, 'File uploaded successfully.'));
});

/**
 * Deletes an uploaded file from Cloudinary before placement.
 */
export const deleteFile = asyncHandler(async (req, res) => {
    // Check both query parameters and request body
    const publicId = req.query.publicId || req.body.publicId;
    
    if (!publicId) {
        throw new ApiError(400, 'publicId is required for deletion');
    }
    
    await deleteFromCloudinary(publicId);
    
    return res
        .status(200)
        .json(new ApiResponse(200, null, 'File deleted successfully.'));
});
