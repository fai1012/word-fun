import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { wordPackController } from '../controllers/wordPackController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Apply middleware to all routes
router.use(authenticateToken, requireAdmin);

router.get('/stats', adminController.getSystemStats.bind(adminController));
router.get('/users', adminController.getAllUsers.bind(adminController));
router.get('/words', adminController.getAllWords.bind(adminController));

// Word Pack Routes
router.post('/word-packs', wordPackController.createWordPack.bind(wordPackController));
router.get('/word-packs', wordPackController.getAdminAllWordPacks.bind(wordPackController));
router.get('/word-packs/tags', wordPackController.getTags.bind(wordPackController));
router.get('/word-packs/:id', wordPackController.getWordPackById.bind(wordPackController));
router.patch('/word-packs/:id', wordPackController.updateWordPack.bind(wordPackController));
router.post('/word-packs/generate-examples', wordPackController.generateExamples.bind(wordPackController));

export default router;
