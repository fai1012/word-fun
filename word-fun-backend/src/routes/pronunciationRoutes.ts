import { Router } from 'express';
import { servePronunciation } from '../controllers/pronunciationController';

const router = Router();

// GET /api/pronunciations/serve?path=...
router.get('/serve', servePronunciation);

export default router;
