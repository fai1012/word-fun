import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { Word } from '../types';

export const generateSessionContent = async (req: Request, res: Response) => {
    try {
        const { words, contextWords } = req.body;

        if (!words || !Array.isArray(words)) {
            res.status(400).json({ error: "Invalid 'words' array" });
            return;
        }

        const filledWords = await aiService.generateSessionContent(words, contextWords || []);
        res.json(filledWords);
    } catch (error: any) {
        console.error("AI Session Content Error:", error);
        res.status(500).json({ error: "Failed to generate content" });
    }
};

export const generateSingleExample = async (req: Request, res: Response) => {
    try {
        const { word, existingExamples } = req.body;

        if (!word) {
            res.status(400).json({ error: "Missing 'word'" });
            return;
        }

        const newExample = await aiService.generateSingleExample(word, existingExamples || []);
        res.json({ example: newExample });
    } catch (error: any) {
        console.error("AI Single Example Error:", error);
        res.status(500).json({ error: "Failed to generate example" });
    }
};
