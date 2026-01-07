import { Request, Response } from 'express';
import { storageService } from '../services/storageService';

export const servePronunciation = async (req: Request, res: Response) => {
    // Expect ?path=...
    const { path: filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
        console.warn('[PronunciationController] Missing path parameter');
        res.status(400).send('Missing path parameter');
        return;
    }

    try {
        console.log(`[PronunciationController] Serving file: ${filePath}`);
        const stream = await storageService.getFileStream(filePath);

        // Set generic audio content type, or try to detect extension
        res.setHeader('Content-Type', 'audio/mpeg');
        // Cache for 1 year as these files are immutable (timestamped)
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*'); // Explicit flow for this endpoint

        stream.pipe(res);
    } catch (error: any) {
        console.error('Error serving pronunciation:', error);
        if (error.message && error.message.includes('File not found')) {
            res.status(404).send('Not Found');
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
};
