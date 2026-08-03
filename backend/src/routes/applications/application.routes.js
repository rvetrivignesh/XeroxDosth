import { Router } from 'express';
import {
    submitApplication,
    getMyApplications,
    withdrawApplication,
    getAllApplications,
    getApplicationById,
    approveApplication,
    rejectApplication
} from '../../controllers/applications/application.controller.js';
import {
    createApplicationValidator,
    rejectApplicationValidator
} from '../../validators/applications/application.validator.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = Router();

// User Routes
// router.post('/', protect, createApplicationValidator, validateRequest, submitApplication);
// router.get('/me', protect, getMyApplications);
// router.delete('/:id', protect, withdrawApplication);

// Admin Routes
router.get('/', protect, authorize('ADMIN'), getAllApplications);
router.get('/:id', protect, authorize('ADMIN'), getApplicationById);
router.patch('/:id/approve', protect, authorize('ADMIN'), approveApplication);
router.patch('/:id/reject', protect, authorize('ADMIN'), rejectApplicationValidator, validateRequest, rejectApplication);

export default router;
