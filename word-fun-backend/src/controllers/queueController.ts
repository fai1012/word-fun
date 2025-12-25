import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { JwtPayload } from 'jsonwebtoken';
import { queueService } from '../services/queueService';

export const queueController = {
    async addToQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { wordId, wordText, profileId } = req.body;

            if (!wordId || !wordText || !profileId) {
                res.status(400).json({ error: 'Missing required fields: wordId, wordText, profileId' });
                return;
            }

            await queueService.addToQueue(wordId, wordText, userId, profileId);
            res.status(200).json({ message: 'Added to queue' });

        } catch (error) {
            console.error('[QueueController] Error adding to queue:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async retryFailedItems(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;

            const count = await queueService.retryFailedItems(userId);
            res.status(200).json({ message: `Successfully queued ${count} items for retry.`, count });

        } catch (error) {
            console.error('[QueueController] Error retrying failed items:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async listAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const items = await queueService.getAllQueueItems();
            res.status(200).json(items);
        } catch (error) {
            console.error('[QueueController] Error listing queue:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    async trigger(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            await queueService.triggerProcessQueue();
            res.status(200).json({ message: 'Queue processing triggered manually' });
        } catch (error) {
            console.error('[QueueController] Error triggering queue:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
