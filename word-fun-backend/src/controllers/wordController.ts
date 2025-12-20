import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { JwtPayload } from 'jsonwebtoken';
import { wordService } from '../services/wordService';

class WordController {
    /**
     * Get all words for a profile.
     * GET /api/profiles/:profileId/words
     */
    async getWords(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { profileId } = req.params;

            if (!profileId) {
                res.status(400).json({ error: 'Missing profileId' });
                return;
            }

            const words = await wordService.getWords(userId, profileId);
            res.status(200).json(words);
        } catch (error) {
            console.error('Error fetching words:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Add a new word to a profile.
     * POST /api/profiles/:profileId/words
     */
    async addWord(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { profileId } = req.params;
            const { text, examples, tags } = req.body;

            if (!profileId || !text) {
                res.status(400).json({ error: 'Missing required fields: profileId, text' });
                return;
            }

            const newWord = await wordService.addWord(userId, profileId, text, examples, tags);
            res.status(201).json(newWord);
        } catch (error: any) {
            console.error('Error adding word:', error);
            if (error.message === 'Profile not found') {
                res.status(404).json({ error: 'Profile not found' });
            } else if (error.message === 'Word already exists') {
                res.status(409).json({ error: 'Word already exists' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    /**
     * Update word stats (revised/correct) or examples.
     * PATCH /api/profiles/:profileId/words/:wordId
     */
    async updateWord(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { profileId, wordId } = req.params;
            const updates = req.body; // { revisedCount, correctCount, examples, tags }

            if (!profileId || !wordId) {
                res.status(400).json({ error: 'Missing parameters' });
                return;
            }

            await wordService.updateWord(userId, profileId, wordId, updates);
            res.status(200).json({ status: 'updated' });
        } catch (error) {
            console.error('Error updating word:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Batch add words.
     * POST /api/profiles/:profileId/words/batch
     */
    async batchAddWords(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { profileId } = req.params;
            const { words, tags } = req.body; // Expects { words: ["word1", "word2"], tags: ["tag1"] }

            if (!profileId || !words || !Array.isArray(words)) {
                res.status(400).json({ error: 'Missing required fields: profileId, words (array)' });
                return;
            }

            const result = await wordService.batchAddWords(userId, profileId, words, tags || []);
            res.status(201).json(result);
        } catch (error) {
            console.error('Error batch adding words:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get all unique tags for a profile.
     * GET /api/profiles/:profileId/tags
     */
    async getTags(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { profileId } = req.params;

            if (!profileId) {
                res.status(400).json({ error: 'Missing profileId' });
                return;
            }

            const tags = await wordService.getTags(userId, profileId);
            res.status(200).json(tags);
        } catch (error) {
            console.error('Error fetching tags:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const wordController = new WordController();
