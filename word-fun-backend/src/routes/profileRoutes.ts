import { Router } from 'express';
import { profileController } from '../controllers/profileController';
import { authenticateToken } from '../middleware/authMiddleware';
import { wordController } from '../controllers/wordController';
import * as aiController from '../controllers/aiController';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: User profile and flashcard management
 */

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Sync User Account & Get Profiles
 *     tags: [Profiles]
 *     description: Checks if the user exists in the database, creates them if not, and returns their account status along with all associated profiles.
 *     responses:
 *       200:
 *         description: User logged in/created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 profiles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Profile'
 */
router.post('/', profileController.syncUser.bind(profileController));

/**
 * @swagger
 * /api/profiles/create:
 *   post:
 *     summary: Create a newly Profile
 *     tags: [Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - displayName
 *               - avatarId
 *             properties:
 *               displayName:
 *                 type: string
 *               avatarId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Profile created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 */
router.post('/create', profileController.createProfile.bind(profileController));

/**
 * @swagger
 * /api/profiles/{profileId}:
 *   patch:
 *     summary: Update profile details
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 */
router.patch('/:profileId', profileController.updateProfile.bind(profileController));

/**
 * @swagger
 * /api/profiles/{profileId}:
 *   delete:
 *     summary: Delete a profile
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Profile deleted successfully.
 */
router.delete('/:profileId', profileController.deleteProfile.bind(profileController));


/**
 * @swagger
 * /api/profiles/{profileId}/words:
 *   get:
 *     summary: Get all words for a profile
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of words.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Word'
 */
router.get('/:profileId/words', wordController.getWords.bind(wordController));

/**
 * @swagger
 * /api/profiles/{profileId}/words:
 *   post:
 *     summary: Add a new word to a profile
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
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
 *               examples:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Word added created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Word'
 */
router.post('/:profileId/words', wordController.addWord.bind(wordController));

/**
 * @swagger
 * /api/profiles/{profileId}/words/{wordId}:
 *   patch:
 *     summary: Update a word
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: wordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               revisedCount:
 *                 type: integer
 *               correctCount:
 *                 type: integer
 *               examples:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Word updated successfully.
 */
router.patch('/:profileId/words/:wordId', wordController.updateWord.bind(wordController));

/**
 * @swagger
 * /api/profiles/{profileId}/words/batch:
 *   post:
 *     summary: Add multiple words at once
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - words
 *             properties:
 *               words:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Words added.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 added:
 *                   type: integer
 *                 skipped:
 *                   type: integer
 */
router.post('/:profileId/words/batch', wordController.batchAddWords.bind(wordController));

/**
 * @swagger
 * /api/profiles/{profileId}/tags:
 *   get:
 *     summary: Get all unique tags for a profile
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tags.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/:profileId/tags', wordController.getTags.bind(wordController));

// AI Generation Routes
router.post('/:profileId/ai/session', aiController.generateSessionContent);
router.post('/:profileId/ai/example', aiController.generateSingleExample);

export default router;
