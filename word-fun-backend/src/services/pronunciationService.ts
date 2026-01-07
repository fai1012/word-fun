import { db } from './firestoreService';
import { ttsService } from './ttsService';
import { storageService } from './storageService';
import { Pronunciation } from '../types';

const COLLECTION_NAME = 'pronunciations';

export const pronunciationService = {
    async getPronunciation(word: string): Promise<Pronunciation | null> {
        if (!word) return null;

        // 1. Check if pronunciation already exists
        const docRef = db.collection(COLLECTION_NAME).doc(word);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log(`[Pronunciation] Found existing pronunciation for "${word}"`);
            const data = doc.data() as Pronunciation;
            // Prefer storagePath
            const path = data.storagePath || data.audioUrl;
            return {
                ...data,
                audioUrl: storageService.getUrl(path)
            };
        }

        console.log(`[Pronunciation] Generatng new pronunciation for "${word}"`);

        // 2. Determine language (simple heuristic, can be improved)
        const isChinese = /[\u4e00-\u9fa5]/.test(word);
        const language = isChinese ? 'zh' : 'en';
        const languageCode = isChinese ? 'zh-HK' : 'en-US';
        const gender = 'NEUTRAL'; // Default as per requirements to pick one

        try {
            // 3. Generate Audio
            const audioBuffer = await ttsService.generatePronunciation(word, languageCode, gender);

            // 4. Upload to Storage
            // Use word directly - GCS handles Unicode filenames natively
            const filename = `pronunciations/${language}/${word}-${Date.now()}.mp3`;
            const storagePath = await storageService.uploadFile(audioBuffer, filename); // Returns relative path now

            // 5. Save to Firestore
            const newPronunciation: Pronunciation = {
                word,
                language,
                // audioUrl: storagePath, // We can store it, or just rely on storagePath. Let's keep consistency.
                audioUrl: storagePath, // Storing path in 'audioUrl' field for now, to avoid schema break, but it's a path.
                storagePath: storagePath,
                createdAt: Date.now()
            };

            await docRef.set(newPronunciation);
            console.log(`[Pronunciation] Created new pronunciation for "${word}" at ${storagePath}`);

            // Return full URL for the immediate caller (addWord) so it can return it to frontend if needed
            return {
                ...newPronunciation,
                audioUrl: storageService.getUrl(storagePath)
            };

        } catch (error) {
            console.error(`[Pronunciation] Failed to generate pronunciation for "${word}":`, error);
            // Return null or throw, depending on how strict we want to be. 
            // For now, log and return null so we don't block the main flow.
            return null;
        }
    },

    async getPronunciations(words: string[]): Promise<Map<string, string>> {
        if (words.length === 0) return new Map();

        // Deduplicate
        const uniqueWords = Array.from(new Set(words));
        const results = new Map<string, string>();
        const chunks = [];

        // Firestore 'in' limit is 30
        for (let i = 0; i < uniqueWords.length; i += 30) {
            chunks.push(uniqueWords.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            try {
                // Use FieldPath.documentId() to query by ID
                const snapshot = await db.collection(COLLECTION_NAME)
                    .where(require('@google-cloud/firestore').FieldPath.documentId(), 'in', chunk)
                    .get();

                snapshot.docs.forEach(doc => {
                    const data = doc.data() as Pronunciation;
                    // Prefer storagePath, fall back to audioUrl checking if it needs resolution
                    const pathOrUrl = data.storagePath || data.audioUrl;
                    if (pathOrUrl) {
                        results.set(doc.id, storageService.getUrl(pathOrUrl));
                    }
                });
            } catch (error) {
                console.error("[Pronunciation] Failed to batch fetch pronunciations", error);
            }
        }
        return results;
    }
};

