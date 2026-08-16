import { Router } from 'express';
import { register, login, logout, getMe, resignRole, getAdmins, demoteAdmin, googleLogin, searchUserForPromotion, promoteUserToAdmin } from '../../controllers/auth/auth.controller.js';
import { registerValidator, loginValidator } from '../../validators/auth/auth.validator.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware.js';
import { protect, authorize } from '../../middleware/auth.middleware.js';

const router = Router();

// Routes
router.post('/register', authRateLimiter, registerValidator, validateRequest, register);
router.post('/login', authRateLimiter, loginValidator, validateRequest, login);
router.post('/google', authRateLimiter, googleLogin);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/resign', protect, resignRole);
router.get('/admins', protect, authorize('ADMIN'), getAdmins);
router.get('/search-user', protect, authorize('ADMIN'), searchUserForPromotion);
router.post('/promote-admin', protect, authorize('ADMIN'), promoteUserToAdmin);
router.patch('/demote-admin/:id', protect, authorize('ADMIN'), demoteAdmin);

export default router;

