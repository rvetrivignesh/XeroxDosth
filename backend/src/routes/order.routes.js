import { Router } from 'express';
import {
    createOrder,
    getUserOrders,
    getShopOrders,
    updateOrderStatus,
    getOrderById
} from '../controllers/order.controller.js';
import {
    createOrderValidator,
    getOrderByIdValidator
} from '../validators/order.validator.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All order routes require authentication
router.use(protect);

router.post('/', createOrderValidator, validateRequest, createOrder);
router.get('/me', getUserOrders);
router.get('/shop', authorize('SHOP'), getShopOrders);
router.patch('/:id/status', authorize('SHOP'), updateOrderStatus);
router.get('/:id', getOrderByIdValidator, validateRequest, getOrderById);

export default router;

