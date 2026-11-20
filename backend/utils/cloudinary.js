const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ekvxyb7r',
    api_key: process.env.CLOUDINARY_API_KEY || '964569463883391',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'iGJuQ9bXVKLWDNXJcNtmvElUlxQ'
});

/**
 * Upload a file Buffer directly to Cloudinary
 * @param {Buffer} buffer - Buffer from multer memoryStorage
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>}
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const defaultOptions = {
            folder: 'skite_prime/payment_screenshots',
            resource_type: 'auto',
            ...options
        };

        const stream = cloudinary.uploader.upload_stream(defaultOptions, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });

        stream.end(buffer);
    });
};

module.exports = {
    cloudinary,
    uploadBufferToCloudinary
};
