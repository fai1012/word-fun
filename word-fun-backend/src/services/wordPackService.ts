import { db } from './firestoreService';
import { WordPackData, WordPackWord } from '../types';
import { pronunciationService } from './pronunciationService';

const COLLECTION_NAME = 'word_packs';

export const wordPackService = {
    // Helper to enrich words with audio URLs
    async enrichWordsWithAudio(words: WordPackWord[]): Promise<WordPackWord[]> {
        if (!words || words.length === 0) return [];
        const chars = words.map(w => w.character);
        const urlMap = await pronunciationService.getPronunciations(chars);

        return words.map(w => ({
            ...w,
            pronunciationUrl: urlMap.get(w.character)
        }));
    },

    // Helper to ensure audio exists
    async ensureAudioForWords(words: WordPackWord[]): Promise<WordPackWord[]> {
        if (!words || !Array.isArray(words)) return [];

        const enrichedWords = [...words];

        // Process in parallel
        await Promise.all(enrichedWords.map(async (word, index) => {
            if (!word.character) return;
            try {
                // This gets or generates the audio
                const pron = await pronunciationService.getPronunciation(word.character);
                if (pron?.audioUrl) {
                    enrichedWords[index] = {
                        ...word,
                        pronunciationUrl: pron.audioUrl
                    };
                }
            } catch (err) {
                console.error(`Failed to generate audio for word pack word: ${word.character}`, err);
            }
        }));

        return enrichedWords;
    },

    async createPack(data: WordPackData): Promise<{ id: string, words: WordPackWord[] }> {
        // Generate audio for all words before saving
        const wordsWithAudio = await this.ensureAudioForWords(data.words);

        const docRef = await db.collection(COLLECTION_NAME).add({
            ...data,
            words: wordsWithAudio, // Save with potential URLs or just the structure
            isPublished: data.isPublished ?? false,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return { id: docRef.id, words: wordsWithAudio };
    },

    async getAllPacks(filters: { isPublished?: boolean } = {}): Promise<any[]> {
        let query: any = db.collection(COLLECTION_NAME);

        if (filters.isPublished !== undefined) {
            query = query.where('isPublished', '==', filters.isPublished);
        }

        const snapshot = await query.get();
        const packs = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
            };
        });

        // We don't enrich list view to avoid N+1 queries or heavy batching for now
        // or we could implementing a lightweight batch enrich if needed. 
        // For admin list, titles are enough.

        return packs.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
        });
    },

    async getPackById(id: string): Promise<any> {
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        if (!doc.exists) return null;
        const data = doc.data();

        // Enrich with latest audio URLs (in case they were regenerated or missing)
        let words = data?.words as WordPackWord[];
        if (words && words.length > 0) {
            const urlMap = await pronunciationService.getPronunciations(words.map(w => w.character));
            words = words.map(w => ({
                ...w,
                pronunciationUrl: urlMap.get(w.character) || w.pronunciationUrl
            }));
        }

        return {
            id: doc.id,
            ...data,
            words,
            createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt
        };
    },

    async updatePack(id: string, data: WordPackData): Promise<{ words: WordPackWord[] }> {
        // Generate audio for new/updated words
        const wordsWithAudio = await this.ensureAudioForWords(data.words);

        await db.collection(COLLECTION_NAME).doc(id).update({
            ...data,
            words: wordsWithAudio,
            updatedAt: new Date()
        });

        return { words: wordsWithAudio };
    },

    async getGlobalTags(): Promise<string[]> {
        const snapshot = await db.collection(COLLECTION_NAME).select('words').get();
        const tagSet = new Set<string>();
        snapshot.docs.forEach(doc => {
            const words = doc.data().words as any[];
            if (words && Array.isArray(words)) {
                words.forEach(word => {
                    if (word.tags && Array.isArray(word.tags)) {
                        word.tags.forEach((tag: string) => tagSet.add(tag));
                    }
                });
            }
        });
        return Array.from(tagSet).sort();
    },

    async deletePack(id: string): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).delete();
    }
};
