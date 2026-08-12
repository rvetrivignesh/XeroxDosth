const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
];

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

/**
 * Validates file structure, size, extension, and mime-type.
 * @param {object} file - The file object from multer memory storage.
 * @returns {string|null} - Error message string if invalid, or null if valid.
 */
export const validateUploadedFile = (file) => {
    if (!file) {
        return 'No file uploaded';
    }
    
    // Validate by extension
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return 'Unsupported file type. Please upload only PDF or image files.';
    }
    
    // Validate by MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return 'Unsupported file type. Please upload only PDF or image files.';
    }
    
    // Validate file size (100 MB limit)
    if (file.size > 100 * 1024 * 1024) {
        return 'File size exceeds the 100 MB limit.';
    }
    
    return null;
};
