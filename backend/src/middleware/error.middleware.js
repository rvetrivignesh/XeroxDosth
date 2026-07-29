import ApiError from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
    let error = err;

    // Convert non-ApiError instances
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
        const message = error.message || "Internal Server Error";
        error = new ApiError(statusCode, message, err.errors || [], err.stack);
    }

    const response = {
        success: false,
        message: error.message
    };

    if (process.env.NODE_ENV === 'development') {
        console.error("Error path:", req.originalUrl);
        console.error(err);
    }

    return res.status(error.statusCode).json(response);
};
