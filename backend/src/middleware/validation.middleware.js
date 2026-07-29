import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        // Map express validation error results directly to ApiError and pass it to error handler middleware
        return next(new ApiError(400, errorMessages[0] || "Validation Error", errors.array()));
    }
    next();
};
