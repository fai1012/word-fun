import { Request, Response } from 'express';
import { wordPackService } from '../services/wordPackService';
import { aiService } from '../services/aiService';
import { WordPackData } from '../types';

export const wordPackController = {
    async createWordPack(req: Request, res: Response) {
        try {
            const data: WordPackData = req.body;

            if (!data.name || !data.words || !Array.isArray(data.words)) {
                return res.status(400).json({ error: 'Invalid word pack data' });
            }

            const result = await wordPackService.createPack(data);
            res.status(201).json({ id: result.id, words: result.words, message: 'Word pack created successfully' });
        } catch (error) {
            console.error('Error creating word pack:', error);
            res.status(500).json({ error: 'Failed to create word pack' });
        }
    },

    async getAllWordPacks(req: Request, res: Response) {
        try {
            // Public endpoint: only return published packs
            const packs = await wordPackService.getAllPacks({ isPublished: true });
            res.status(200).json(packs);
        } catch (error) {
            console.error('Error fetching word packs:', error);
            res.status(500).json({ error: 'Failed to fetch word packs' });
        }
    },

    async getAdminAllWordPacks(req: Request, res: Response) {
        try {
            // Admin endpoint: return all packs (drafts + published)
            const packs = await wordPackService.getAllPacks();
            res.status(200).json(packs);
        } catch (error) {
            console.error('Error fetching admin word packs:', error);
            res.status(500).json({ error: 'Failed to fetch word packs' });
        }
    },

    async getWordPackById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const pack = await wordPackService.getPackById(id);
            if (!pack) {
                return res.status(404).json({ error: 'Word pack not found' });
            }
            res.status(200).json(pack);
        } catch (error) {
            console.error('Error fetching word pack:', error);
            res.status(500).json({ error: 'Failed to fetch word pack' });
        }
    },

    async updateWordPack(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data: WordPackData = req.body;

            if (!data.name || !data.words || !Array.isArray(data.words)) {
                return res.status(400).json({ error: 'Invalid word pack data' });
            }

            const result = await wordPackService.updatePack(id, data);
            res.status(200).json({ message: 'Word pack updated successfully', words: result.words });
        } catch (error) {
            console.error('Error updating word pack:', error);
            res.status(500).json({ error: 'Failed to update word pack' });
        }
    },

    async generateExamples(req: Request, res: Response) {
        try {
            const { word } = req.body;
            if (!word) {
                return res.status(400).json({ error: 'Word is required' });
            }

            const examples = await aiService.generateWordPackExamples(word);
            res.status(200).json({ examples });
        } catch (error) {
            console.error('Error generating examples for word pack:', error);
            res.status(500).json({ error: 'Failed to generate examples' });
        }
    },

    async getTags(req: Request, res: Response) {
        try {
            const tags = await wordPackService.getGlobalTags();
            res.status(200).json(tags);
        } catch (error) {
            console.error('Error fetching global tags:', error);
            res.status(500).json({ error: 'Failed to fetch tags' });
        }
    }
};
