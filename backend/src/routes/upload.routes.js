import { Router } from 'express';
import { uploadFile, deleteFile } from '../controllers/upload.controller.js';
import { handleUploadMiddleware } from '../middleware/upload.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All uploads/deletions must be performed by authenticated users
router.use(protect);

router.post('/', handleUploadMiddleware, uploadFile);
router.delete('/', deleteFile);

export default router;
