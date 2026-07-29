import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as authService from '../../services/auth/auth.service.js';
import { verifyGoogleToken } from '../../services/auth/googleAuth.service.js';

export const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    
    // Call service to register user
    const data = await authService.registerUser(name, email, password);
    
    // Set cookie if option is desired (e.g. for cookie based auth compatibility)
    res.cookie('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res
        .status(201)
        .json(new ApiResponse(201, data, "User registered successfully"));
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    // Call service to authenticate user
    const data = await authService.loginUser(email, password);
    
    // Set cookie
    res.cookie('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res
        .status(200)
        .json(new ApiResponse(200, data, "Logged in successfully"));
});

export const logout = asyncHandler(async (req, res) => {
    // Clear JWT cookie
    res.clearCookie('token');
    
    return res
        .status(200)
        .json(new ApiResponse(200, null, "Successfully logged out"));
});

export const getMe = asyncHandler(async (req, res) => {
    // req.user is set by the protect middleware. Return it in standard format.
    return res
        .status(200)
        .json(new ApiResponse(200, { user: req.user }, "User details retrieved successfully"));
});

export const resignRole = asyncHandler(async (req, res) => {
    const updatedUser = await authService.resignRole(req.user._id);
    return res
        .status(200)
        .json(new ApiResponse(200, { user: updatedUser }, "Successfully resigned role and reverted to standard User"));
});

export const getAdmins = asyncHandler(async (req, res) => {
    const admins = await authService.getAdmins();
    return res
        .status(200)
        .json(new ApiResponse(200, admins, "Admins retrieved successfully"));
});

export const demoteAdmin = asyncHandler(async (req, res) => {
    const demotedUser = await authService.demoteAdmin(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, demotedUser, "Admin successfully demoted to User"));
});

export const googleLogin = asyncHandler(async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({
            success: false,
            message: "Google ID token is required"
        });
    }

    // Verify token
    const payload = await verifyGoogleToken(idToken);

    // Call service to login/register Google user
    const data = await authService.loginOrCreateGoogleUser(payload);

    // Set cookie
    res.cookie('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Google authentication successful"));
});

