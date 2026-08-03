import { body } from 'express-validator';

const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const applyShopValidator = [
    body('shopName')
        .trim()
        .notEmpty().withMessage('Shop name is required'),
    body('upiId')
        .trim()
        .notEmpty().withMessage('UPI ID is required'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required'),
    body('location.address')
        .trim()
        .notEmpty().withMessage('Address is required'),
    body('location.googleMapsLink')
        .optional()
        .trim(),
    body('images')
        .optional()
        .isArray().withMessage('Images must be an array of image URLs/paths')
        .custom((images) => {
            if (images && images.length > 5) {
                throw new Error('Maximum of 5 images allowed');
            }
            if (images && images.some(img => typeof img !== 'string')) {
                throw new Error('Each image path must be a string');
            }
            return true;
        }),
    body('openTiming.open')
        .trim()
        .notEmpty().withMessage('Opening time is required'),
    body('openTiming.close')
        .trim()
        .notEmpty().withMessage('Closing time is required'),
    body('openDays')
        .isArray({ min: 1 }).withMessage('Open days must be an array with at least one day')
        .custom((days) => {
            const invalidDays = days.filter(d => !VALID_DAYS.includes(d));
            if (invalidDays.length > 0) {
                throw new Error(`Invalid open days: ${invalidDays.join(', ')}. Valid days are ${VALID_DAYS.join(', ')}`);
            }
            return true;
        }),
    body('pricing.bwPerPage')
        .optional()
        .isFloat({ min: 0 }).withMessage('Black & White cost per page must be a non-negative number'),
    body('pricing.colorPerPage')
        .optional()
        .isFloat({ min: 0 }).withMessage('Coloured cost per page must be a non-negative number'),
    body('pricing.spiralBinding')
        .optional()
        .isFloat({ min: 0 }).withMessage('Spiral binding cost must be a non-negative number'),
    body('pricing.bookBinding')
        .optional()
        .isFloat({ min: 0 }).withMessage('Book binding cost must be a non-negative number'),
    body('printingRates.bwSingle')
        .optional()
        .isFloat({ min: 0 }).withMessage('B&W Single Side cost must be a non-negative number'),
    body('printingRates.bwDouble')
        .optional()
        .isFloat({ min: 0 }).withMessage('B&W Double Side cost must be a non-negative number'),
    body('printingRates.colourSingle')
        .optional()
        .isFloat({ min: 0 }).withMessage('Colour Single Side cost must be a non-negative number'),
    body('printingRates.colourDouble')
        .optional()
        .isFloat({ min: 0 }).withMessage('Colour Double Side cost must be a non-negative number'),
    body('printingRates.spiralBinding')
        .optional()
        .isFloat({ min: 0 }).withMessage('Spiral Binding cost must be a non-negative number'),
    body('printingRates.bookBinding')
        .optional()
        .isFloat({ min: 0 }).withMessage('Book Binding cost must be a non-negative number'),
    body('homeDelivery')
        .optional()
        .isBoolean().withMessage('Home delivery must be a boolean'),
    body('freeDelivery')
        .optional()
        .isBoolean().withMessage('Free delivery must be a boolean'),
    body('deliveryCharges')
        .optional()
        .isArray().withMessage('Delivery charges must be an array of slabs'),
    body('deliveryCharges.*.from')
        .optional()
        .isFloat({ min: 0 }).withMessage('Delivery charge from distance must be a non-negative number'),
    body('deliveryCharges.*.to')
        .optional()
        .isFloat({ min: 0 }).withMessage('Delivery charge to distance must be a non-negative number'),
    body('deliveryCharges.*.charge')
        .optional()
        .isFloat({ min: 0 }).withMessage('Delivery charge cost must be a non-negative number'),
    body('expressPrinting')
        .optional()
        .isBoolean().withMessage('Express printing availability must be a boolean'),
    body('freeExpressDelivery')
        .optional()
        .isBoolean().withMessage('Free express delivery availability must be a boolean'),
    body('expressDeliveryCharges')
        .optional()
        .isArray().withMessage('Express delivery charges must be an array of slabs'),
    body('expressDeliveryCharges.*.from')
        .optional()
        .isFloat({ min: 0 }).withMessage('Express delivery charge from distance must be a non-negative number'),
    body('expressDeliveryCharges.*.to')
        .optional()
        .isFloat({ min: 0 }).withMessage('Express delivery charge to distance must be a non-negative number'),
    body('expressDeliveryCharges.*.charge')
        .optional()
        .isFloat({ min: 0 }).withMessage('Express delivery charge cost must be a non-negative number'),
    body('isDeliveryAvailable')
        .optional()
        .isBoolean().withMessage('Delivery availability must be a boolean'),
    body('isCodAvailable')
        .optional()
        .isBoolean().withMessage('COD availability must be a boolean'),
    // Ensure protected fields are stripped / rejected if passed
    body(['status', 'reviewedBy', 'reviewedAt', 'rejectionReason'])
        .custom((val, { req, path }) => {
            if (req.body[path] !== undefined) {
                throw new Error(`Field '${path}' cannot be set during shop application submission`);
            }
            return true;
        })
];

