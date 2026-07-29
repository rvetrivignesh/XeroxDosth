const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
];

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];

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
        return 'Unsupported file format. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, JPEG, PNG.';
    }
    
    // Validate by MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return `Unsupported file type (MIME): ${file.mimetype}`;
    }
    
    // Validate file size (100 MB limit)
    if (file.size > 100 * 1024 * 1024) {
        return 'File size exceeds the 100 MB limit.';
    }
    
    return null;
};
