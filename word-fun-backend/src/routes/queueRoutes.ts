import { Router } from 'express';
import { queueController } from '../controllers/queueController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// User Routes
router.post('/add', authenticateToken, queueController.addToQueue);

// Admin Routes
router.get('/all', authenticateToken, requireAdmin, queueController.listAll);
router.post('/trigger', authenticateToken, requireAdmin, queueController.trigger);
router.post('/retry', authenticateToken, requireAdmin, queueController.retryFailedItems);

export default router;
