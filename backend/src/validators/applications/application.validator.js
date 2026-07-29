import { body } from 'express-validator';

export const createApplicationValidator = [
    body('requestedRole')
        .trim()
        .notEmpty().withMessage('Requested role is required')
        .isIn(['SHOP', 'ADMIN']).withMessage('Requested role must be either SHOP or ADMIN'),
    body('applicantName')
        .trim()
        .notEmpty().withMessage('Applicant name is required'),
    body('shopName')
        .if(body('requestedRole').equals('SHOP'))
        .trim()
        .notEmpty().withMessage('Shop name is required for SHOP applications'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required'),
    body('description')
        .optional()
        .trim()
];

export const rejectApplicationValidator = [
    body('rejectionReason')
        .trim()
        .notEmpty().withMessage('Rejection reason is required')
];
