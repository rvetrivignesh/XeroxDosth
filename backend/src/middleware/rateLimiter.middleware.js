import { rateLimit } from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new ApiError(429, "Too many requests from this IP, please try again after 15 minutes"));
    }
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new ApiError(429, "Too many authentication attempts from this IP, please try again after 15 minutes"));
    }
});
