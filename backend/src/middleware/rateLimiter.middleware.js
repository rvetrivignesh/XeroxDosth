import { rateLimit } from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';

const shouldSkipRateLimit = (req) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return false;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && (decoded.role === 'SHOP' || decoded.role === 'ADMIN')) {
            return true;
        }
    } catch (error) {
        // Token is invalid, expired, or not present - apply rate limit
    }
    return false;
};

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkipRateLimit,
    handler: (req, res, next) => {
        next(new ApiError(429, "Too many requests from this IP, please try again after 15 minutes"));
    }
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per window
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkipRateLimit,
    handler: (req, res, next) => {
        next(new ApiError(429, "Too many authentication attempts from this IP, please try again after 15 minutes"));
    }
});
