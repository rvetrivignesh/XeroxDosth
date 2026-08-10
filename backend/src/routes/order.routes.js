import { Router } from 'express';
import {
    createOrder,
    getUserOrders,
    getShopOrders,
    updateOrderStatus,
    getOrderById,
    acceptOrder,
    rejectOrder,
    cancelOrder,
    requestCancellation,
    approveCancellation,
    rejectCancellation,
    payOrder
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

// Workflow state transition routes
router.patch('/:id/accept', authorize('SHOP'), acceptOrder);
router.patch('/:id/reject', authorize('SHOP'), rejectOrder);
router.patch('/:id/cancel', cancelOrder); // User or shop
router.patch('/:id/request-cancellation', requestCancellation);
router.patch('/:id/approve-cancellation', authorize('SHOP'), approveCancellation);
router.patch('/:id/reject-cancellation', authorize('SHOP'), rejectCancellation);
router.patch('/:id/pay', payOrder);

router.get('/:id', getOrderByIdValidator, validateRequest, getOrderById);

export default router;
