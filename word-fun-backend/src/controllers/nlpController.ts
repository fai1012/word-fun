import { Request, Response } from 'express';
import { wordValidationService } from '../services/wordValidationService';

class NLPController {
    async analyzeSentence(req: Request, res: Response) {
        try {
            const { text } = req.body;
            if (!text || (Array.isArray(text) && text.length === 0)) {
                return res.status(400).json({ error: 'Text or array of text is required' });
            }

            const results = await wordValidationService.getSentenceLemmas(text);
            res.json(Array.isArray(text) ? { results } : { lemmas: results });
        } catch (error) {
            console.error('[NLPController] Analysis failed:', error);
            res.status(500).json({ error: 'Failed to analyze sentence' });
        }
    }
}

export const nlpController = new NLPController();
