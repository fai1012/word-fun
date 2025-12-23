import { Router } from 'express';
import { queueController } from '../controllers/queueController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// POST /api/queue/add
router.post('/add', authenticateToken, queueController.addToQueue);

export default router;
