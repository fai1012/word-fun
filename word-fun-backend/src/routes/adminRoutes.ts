import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Apply middleware to all routes
router.use(authenticateToken, requireAdmin);

router.get('/stats', adminController.getSystemStats.bind(adminController));
router.get('/users', adminController.getAllUsers.bind(adminController));
router.get('/words', adminController.getAllWords.bind(adminController));

export default router;
