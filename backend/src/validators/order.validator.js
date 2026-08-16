import { body, param } from 'express-validator';

const VALID_PRINT_SIDES = ['SINGLE_SIDE', 'DOUBLE_SIDE'];
const VALID_BINDINGS = ['NONE', 'SPIRAL', 'BOOK'];
const VALID_PAYMENT_METHODS = ['ONLINE', 'COD'];

export const createOrderValidator = [
    body('shop')
        .notEmpty().withMessage('Shop ID is required')
        .isMongoId().withMessage('Invalid Shop ID format'),

    body('documents')
        .isArray({ min: 1, max: 10 }).withMessage('Documents must be an array containing between 1 and 10 items')
        .custom((documents) => {
            if (!Array.isArray(documents)) return false;
            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                if (!doc || typeof doc !== 'object') {
                    throw new Error(`Document at index ${i} must be an object`);
                }
                if (!doc.publicId || typeof doc.publicId !== 'string' || doc.publicId.trim() === '') {
                    throw new Error(`Document at index ${i} must have a valid non-empty publicId`);
                }
                if (!doc.url || typeof doc.url !== 'string' || doc.url.trim() === '') {
                    throw new Error(`Document at index ${i} must have a valid url`);
                }
                if (!doc.originalName || typeof doc.originalName !== 'string' || doc.originalName.trim() === '') {
                    throw new Error(`Document at index ${i} must have a valid originalName`);
                }
                if (typeof doc.size !== 'number' || doc.size <= 0) {
                    throw new Error(`Document at index ${i} must have a valid numeric size`);
                }
                if (doc.size > 10 * 1024 * 1024) {
                    throw new Error(`Document at index ${i} exceeds the maximum file size limit of 10 MB`);
                }
                if (!doc.mimeType || typeof doc.mimeType !== 'string' || doc.mimeType.trim() === '') {
                    throw new Error(`Document at index ${i} must have a valid mimeType`);
                }
                const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
                const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
                const ext = doc.originalName ? doc.originalName.substring(doc.originalName.lastIndexOf('.')).toLowerCase() : '';
                if (!allowedExtensions.includes(ext) || !allowedMimes.includes(doc.mimeType)) {
                    throw new Error(`Document at index ${i} has an unsupported file format. Please upload a PDF or image file (JPG, PNG, or WEBP).`);
                }
                if (doc.printingMode === 'advanced') {
                    const bwSingle = Array.isArray(doc.bwSinglePages) ? doc.bwSinglePages : [];
                    const bwDouble = Array.isArray(doc.bwDoublePages) ? doc.bwDoublePages : [];
                    const colSingle = Array.isArray(doc.colorSinglePages) ? doc.colorSinglePages : [];
                    const colDouble = Array.isArray(doc.colorDoublePages) ? doc.colorDoublePages : [];

                    const pageCount = Number(doc.pageCount || 1);
                    const allLists = [bwSingle, bwDouble, colSingle, colDouble];
                    
                    for (const list of allLists) {
                        for (const page of list) {
                            if (!Number.isInteger(page)) {
                                throw new Error(`Document at index ${i}: Page numbers must be valid integers.`);
                            }
                            if (page < 1 || page > pageCount) {
                                throw new Error(`Document at index ${i}: Page number ${page} is out of document range [1-${pageCount}].`);
                            }
                        }
                    }

                    const allPages = [...bwSingle, ...bwDouble, ...colSingle, ...colDouble];
                    const uniquePages = [...new Set(allPages)];
                    if (uniquePages.length !== allPages.length) {
                        const seen = new Set();
                        for (const p of allPages) {
                            if (seen.has(p)) {
                                throw new Error(`Document at index ${i}: Page ${p} has already been assigned to another printing option. Each page can only have one printing type.`);
                            }
                            seen.add(p);
                        }
                    }

                    if (allPages.length !== pageCount) {
                        throw new Error(`Document at index ${i}: Please assign all pages or select "Apply for rest of the pages" for either Single-Sided B&W or Double-Sided B&W.`);
                    }

                    const sortedBwDouble = [...bwDouble].sort((a, b) => a - b);
                    if (sortedBwDouble.length % 2 !== 0) {
                        throw new Error(`Document at index ${i}: Double-sided pages must be entered as continuous pairs, e.g. 2,3,6,7,9,10.`);
                    }
                    for (let k = 0; k < sortedBwDouble.length; k += 2) {
                        if (sortedBwDouble[k + 1] !== sortedBwDouble[k] + 1) {
                            throw new Error(`Document at index ${i}: Double-sided pages must be entered as continuous pairs, e.g. 2,3,6,7,9,10.`);
                        }
                    }

                    const sortedColDouble = [...colDouble].sort((a, b) => a - b);
                    if (sortedColDouble.length % 2 !== 0) {
                        throw new Error(`Document at index ${i}: Double-sided pages must be entered as continuous pairs, e.g. 2,3,6,7,9,10.`);
                    }
                    for (let k = 0; k < sortedColDouble.length; k += 2) {
                        if (sortedColDouble[k + 1] !== sortedColDouble[k] + 1) {
                            throw new Error(`Document at index ${i}: Double-sided pages must be entered as continuous pairs, e.g. 2,3,6,7,9,10.`);
                        }
                    }
                } else {
                    if (doc.printSide === 'DOUBLE_SIDE' && (doc.colorPages || 0) > 0) {
                        throw new Error(`Document at index ${i}: Color printing is only available for single-sided printing.`);
                    }
                }
                try {
                    new URL(doc.url);
                } catch {
                    throw new Error(`Document at index ${i} has an invalid URL format in url`);
                }
            }
            return true;
        }),

    body('bwPages')
        .optional()
        .isInt({ min: 0 }).withMessage('Black & white pages must be an integer greater than or equal to 0'),

    body('colorPages')
        .optional()
        .isInt({ min: 0 }).withMessage('Color pages must be an integer greater than or equal to 0'),

    body('totalPages')
        .custom((val, { req }) => {
            const bw = req.body.bwPages !== undefined ? Number(req.body.bwPages) : 0;
            const color = req.body.colorPages !== undefined ? Number(req.body.colorPages) : 0;
            const total = bw + color;
            if (total < 1) {
                throw new Error('Order must contain at least 1 page (sum of black & white and color pages must be > 0)');
            }
            if (val !== undefined && Number(val) !== total) {
                throw new Error(`totalPages (${val}) does not match the sum of bwPages (${bw}) and colorPages (${color})`);
            }
            return true;
        }),

    body('copies')
        .optional()
        .isInt({ min: 1 }).withMessage('Copies must be an integer greater than or equal to 1'),

    body('printSide')
        .trim()
        .notEmpty().withMessage('Print side is required')
        .isIn(VALID_PRINT_SIDES).withMessage(`Print side must be one of: ${VALID_PRINT_SIDES.join(', ')}`)
        .custom((printSide, { req }) => {
            const colorPages = req.body.colorPages !== undefined ? Number(req.body.colorPages) : 0;
            if (printSide === 'DOUBLE_SIDE' && colorPages > 0) {
                throw new Error('Color printing is only available for single-sided printing.');
            }
            return true;
        }),

    body('binding')
        .trim()
        .notEmpty().withMessage('Binding is required')
        .isIn(VALID_BINDINGS).withMessage(`Binding must be one of: ${VALID_BINDINGS.join(', ')}`),

    body('requiredBy')
        .notEmpty().withMessage('Required by date is required')
        .isISO8601().withMessage('Required by must be a valid ISO date string')
        .custom((value) => {
            const reqDate = new Date(value);
            if (isNaN(reqDate.getTime())) {
                throw new Error('Invalid date format for requiredBy');
            }
            if (reqDate <= new Date()) {
                throw new Error('requiredBy date must be a future date and time');
            }
            return true;
        }),

    body('paymentMethod')
        .optional()
        .trim()
        .isIn(['ONLINE', 'COD', 'UPI']).withMessage('Invalid payment method'),

    body('transactionId')
        .optional()
        .trim()
        .isString().withMessage('Transaction ID must be a string'),

    body('instructions')
        .optional()
        .trim()
        .isString().withMessage('Instructions must be a string'),

    body('customerContact')
        .trim()
        .notEmpty().withMessage('Customer contact details are required')
        .isString().withMessage('Customer contact details must be a string'),

    body('customerEmail')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('Please enter a valid email address'),

    body('fulfillmentMethod')
        .trim()
        .notEmpty().withMessage('Fulfillment method is required')
        .isIn(['SHOP_PICKUP', 'HOME_DELIVERY', 'RECORD_PICKUP']).withMessage('Fulfillment method must be SHOP_PICKUP, HOME_DELIVERY or RECORD_PICKUP'),

    body('deliveryType')
        .optional()
        .trim()
        .isIn(['STANDARD', 'EXPRESS', 'NONE']).withMessage('Delivery type must be STANDARD, EXPRESS or NONE'),

    body('deliveryDistance')
        .optional()
        .isFloat({ min: 0 }).withMessage('Delivery distance must be a positive number'),

    body('paymentType')
        .trim()
        .notEmpty().withMessage('Payment type is required')
        .isIn(['UPI', 'COD', 'ONLINE']).withMessage('Payment type must be UPI, COD or ONLINE'),

    body('deliveryAddress')
        .if((value, { req }) => {
            return req.body.fulfillmentMethod === 'HOME_DELIVERY' || 
                   (req.body.fulfillmentMethod === 'RECORD_PICKUP' && ['STANDARD', 'EXPRESS'].includes(req.body.deliveryType));
        })
        .trim()
        .notEmpty().withMessage('Delivery address is required when delivery is selected'),

    // Ensure status, paymentStatus, and backend pricing calculations cannot be provided by the client
    body(['status', 'paymentStatus', 'bwSubtotal', 'colorSubtotal', 'totalAmount', 'deliveryCharge', 'otherServiceCharges', 'bwPerPagePrice', 'colorPerPagePrice'])
        .custom((val, { req, path }) => {
            if (req.body[path] !== undefined) {
                throw new Error(`Field '${path}' is calculated on the backend and cannot be specified directly`);
            }
            return true;
        })
];


export const getOrderByIdValidator = [
    param('id')
        .notEmpty().withMessage('Order ID parameter is required')
        .isMongoId().withMessage('Invalid Order ID format')
];
