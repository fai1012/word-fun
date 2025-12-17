import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { Word } from '../types';

export const generateSessionContent = async (req: Request, res: Response) => {
    try {
        console.log("[AI Controller] Received session generation request");
        const { words, contextWords } = req.body;

        const user = (req as any).user;
        const userId = user.id || user.sub;
        const { profileId } = req.params;

        if (!words || !Array.isArray(words)) {
            res.status(400).json({ error: "Invalid 'words' array" });
            return;
        }

        // Background this call (Fire and forget)
        aiService.generateSessionContent(userId, profileId, words, contextWords || []).catch(err => {
            console.error("[AI] Background session generation failed:", err);
        });

        // Return original words immediately so game can start
        res.json(words);
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
