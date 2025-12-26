import { Router } from 'express';
import { nlpController } from '../controllers/nlpController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Require authentication for NLP analysis
router.use(authenticateToken);

/**
 * @swagger
 * /api/nlp/analyze:
 *   post:
 *     summary: Analyze a sentence for lemmas and POS tags
 *     tags: [NLP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sentence analyzed successfully.
 */
router.post('/analyze', nlpController.analyzeSentence.bind(nlpController));

export default router;
