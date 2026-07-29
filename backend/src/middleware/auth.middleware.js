import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/users/user.model.js';

export const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // Check cookies
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        throw new ApiError(401, "Not authorized to access this route");
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user and make sure user still exists in DB
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new ApiError(401, "User belonging to this token no longer exists");
        }

        // Verify account status
        if (user.accountStatus !== 'ACTIVE') {
            throw new ApiError(403, `User account is ${user.accountStatus.toLowerCase()}`);
        }

        // Attach user to req object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, "Token has expired, please log in again");
        }
        throw new ApiError(401, "Not authorized to access this route");
    }
});

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, "Not authorized to access this route");
        }
        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, `User role '${req.user.role}' is not authorized to access this route`);
        }
        next();
    };
};
