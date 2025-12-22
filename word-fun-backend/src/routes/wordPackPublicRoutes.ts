import { Router } from 'express';
import { wordPackController } from '../controllers/wordPackController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Retrieve all public word packs (Authenticated users only)
router.get('/', authenticateToken, wordPackController.getAllWordPacks.bind(wordPackController));

export default router;
