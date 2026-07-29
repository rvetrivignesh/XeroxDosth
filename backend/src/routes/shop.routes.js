import { Router } from 'express';
import {
    applyForShop,
    getMyShopApplication,
    updateMyShopDetails,
    getApprovedShops,
    getAllShopsAdmin,
    updateShopStatusAdmin
} from '../controllers/shop.controller.js';
import { applyShopValidator } from '../validators/shop.validator.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Public / Approved Shops list
router.get('/approved', protect, getApprovedShops);

// Shop Application & Management Routes
router.post('/apply', protect, authorize('USER'), applyShopValidator, validateRequest, applyForShop);
router.get('/me', protect, getMyShopApplication);
router.patch('/me', protect, authorize('SHOP'), updateMyShopDetails);

// Admin Routes
router.get('/admin/all', protect, authorize('ADMIN'), getAllShopsAdmin);
router.patch('/admin/:id/status', protect, authorize('ADMIN'), updateShopStatusAdmin);

export default router;

