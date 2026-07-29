import cloudinary from '../config/cloudinary.js';

/**
 * Uploads a file buffer directly to Cloudinary using streams.
 * @param {Buffer} fileBuffer - File data buffer.
 * @param {string} [folder='xerox-dosth/documents'] - Cloudinary folder path.
 * @returns {Promise<object>} Upload result details.
 */
export const uploadToCloudinary = (fileBuffer, folder = 'xerox-dosth/documents') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

/**
 * Deletes a file from Cloudinary based on its public ID and optional mimetype.
 * @param {string} publicId - The public ID of the resource.
 * @param {string} [mimeType] - Optional MIME type to identify resource_type.
 * @returns {Promise<object>} Deletion result.
 */
export const deleteFromCloudinary = async (publicId, mimeType) => {
    let resourceType = 'raw';
    if (mimeType) {
        const isImageOrPdf = mimeType.startsWith('image/') || mimeType === 'application/pdf';
        resourceType = isImageOrPdf ? 'image' : 'raw';
    } else {
        const ext = publicId.split('.').pop().toLowerCase();
        const imageAndPdfExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
        resourceType = imageAndPdfExtensions.includes(ext) ? 'image' : 'raw';
    }
    
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
};
