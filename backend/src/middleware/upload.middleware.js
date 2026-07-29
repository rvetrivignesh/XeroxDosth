import multer from 'multer';

// Memory storage keeps file buffers in memory for streaming to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB maximum size
    }
});

const uploadSingle = upload.single('document');

/**
 * Middleware to parse file uploads and handle limits or errors gracefully.
 */
export const handleUploadMiddleware = (req, res, next) => {
    uploadSingle(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds the 100 MB limit.'
                });
            }
            return res.status(400).json({
                success: false,
                message: `File upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        next();
    });
};
