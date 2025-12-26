import { db } from './firestoreService';
import { Word } from '../types';
import { aiService } from './aiService';
import { pronunciationService } from './pronunciationService';
import { storageService } from './storageService';
import { queueService } from './queueService';
import { wordValidationService } from './wordValidationService';

class WordService {
    private getCollection(userId: string, profileId: string) {
        return db.collection('users').doc(userId).collection('profiles').doc(profileId).collection('words');
    }

    async addWord(userId: string, profileId: string, text: string, examples: string[] = [], tags: string[] = []): Promise<Word> {
        // 1. Verify Profile Exists
        const profileRef = db.collection('users').doc(userId).collection('profiles').doc(profileId);
        const profileDoc = await profileRef.get();
        if (!profileDoc.exists) {
            throw new Error('Profile not found');
        }

        const wordsCollection = this.getCollection(userId, profileId);
        const now = new Date();

        const isChinese = (s: string) => /[\u4e00-\u9fa5]/.test(s);
        const language = isChinese(text) ? 'zh' : 'en';

        // 2. Extract root form early for duplication check
        const validation = await wordValidationService.validateWord(text);
        const rootForm = validation.rootForm;
        const normalizedText = rootForm || text;

        // 3. Check for Duplicates using normalized text
        const duplicateSnapshot = await wordsCollection.where('text', '==', normalizedText).limit(1).get();
        if (!duplicateSnapshot.empty) {
            throw new Error('Word already exists');
        }

        const wordsRef = wordsCollection.doc();

        const newWord: Word = {
            id: wordsRef.id,
            text: normalizedText, // Store root form as primary text
            language,
            rootForm,
            revisedCount: 0,
            correctCount: 0,
            examples,
            tags,
            createdAt: now
        };

        await wordsRef.set(newWord);

        // 3. Generate Pronunciation (Await so we can return the URL immediately)
        try {
            const pronunciation = await pronunciationService.getPronunciation(text);
            if (pronunciation?.audioUrl) {
                // Attach for the immediate response
                newWord.pronunciationUrl = pronunciation.audioUrl;

                // Optional: Update the word doc to store the URL/path to avoid future lookups
                // but getWords handles lazy lookup so it's strictly not required for data integrity,
                // just helpful for performance. Let's keep it simple and just return it for now
                // to match the user request "update the audio url... they don't have to refresh".
            }
        } catch (err) {
            console.error(`[WordService] Failed to generate pronunciation for ${text}`, err);
        }

        // 4. Trigger AI Generation if no examples provided
        if (!examples || examples.length === 0) {
            queueService.addToQueue(newWord.id, newWord.text, userId, profileId)
                .catch(err => console.error(`[WordService] Failed to add ${text} to queue`, err));
        }

        return newWord;
    }

    async getWords(userId: string, profileId: string): Promise<Word[]> {
        const snapshot = await this.getCollection(userId, profileId).orderBy('createdAt', 'asc').get();

        const words = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                text: data.text,
                language: data.language || 'zh',
                revisedCount: data.revisedCount || 0,
                correctCount: data.correctCount || 0,
                examples: data.examples || [],
                tags: data.tags || [],
                // Populated with full URL OR relative path. storageService.getUrl manages resolution.
                pronunciationUrl: data.pronunciationUrl ? storageService.getUrl(data.pronunciationUrl) : undefined,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                lastReviewedAt: data.lastReviewedAt?.toDate ? data.lastReviewedAt.toDate() : (data.lastReviewedAt ? new Date(data.lastReviewedAt) : undefined),
                masteredAt: data.masteredAt?.toDate ? data.masteredAt.toDate() : (data.masteredAt ? new Date(data.masteredAt) : undefined)
            } as Word;
        });

        // Optimization: Lazy-load missing pronunciations
        // We do not await this to slow down the request significantly? 
        // Actually, the user wants the icon to show/hide. We MUST wait.
        // Batch lookup strictly for words missing the URL
        const missingUrlWords = words.filter(w => !w.pronunciationUrl).map(w => w.text);

        if (missingUrlWords.length > 0) {
            const urlMap = await pronunciationService.getPronunciations(missingUrlWords);

            // Populate responses
            words.forEach(w => {
                if (!w.pronunciationUrl && urlMap.has(w.text)) {
                    w.pronunciationUrl = urlMap.get(w.text);
                }
            });

            // Optional: Fire-and-forget update to backfill the user's word docs? 
            // This heals the data over time so next read is faster.
            // However, doing 100 writes might be too much.
            // Let's rely on the fast lookup for now as it handles shared pronunciation benefit immediately.
        }

        return words;
    }

    async updateWord(userId: string, profileId: string, wordId: string, updates: Partial<Pick<Word, 'revisedCount' | 'correctCount' | 'examples' | 'lastReviewedAt' | 'masteredAt' | 'tags'>>): Promise<void> {
        const wordRef = this.getCollection(userId, profileId).doc(wordId);
        await wordRef.update(updates);
    }

    async getTags(userId: string, profileId: string): Promise<string[]> {
        const snapshot = await this.getCollection(userId, profileId).select('tags').get();
        const tagSet = new Set<string>();
        snapshot.docs.forEach(doc => {
            const tags = doc.data().tags as string[] | undefined;
            if (tags && Array.isArray(tags)) {
                tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    }

    async batchAddWords(userId: string, profileId: string, inputWords: (string | { text: string; tags?: string[] })[], globalTags: string[] = []): Promise<{ added: number; skipped: number }> {
        const wordsCollection = this.getCollection(userId, profileId);

        // 1. Sanitize and normalize input
        const normalizedInputs = inputWords.map(input => {
            if (typeof input === 'string') {
                return { text: input.trim(), tags: globalTags };
            }
            return {
                text: input.text.trim(),
                tags: [...globalTags, ...(input.tags || [])]
            };
        }).filter(input => input.text.length > 0);

        if (normalizedInputs.length === 0) return { added: 0, skipped: 0 };

        const isChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

        // 2. Pre-process words to get root forms and consolidated tags
        const consolidatedInputs = new Map<string, { tags: string[]; rootForm?: string }>();
        for (const input of normalizedInputs) {
            const validation = await wordValidationService.validateWord(input.text);
            const targetText = validation.rootForm || input.text;

            const existingEntry = consolidatedInputs.get(targetText);
            if (existingEntry) {
                existingEntry.tags = Array.from(new Set([...existingEntry.tags, ...input.tags]));
            } else {
                consolidatedInputs.set(targetText, {
                    tags: input.tags,
                    rootForm: validation.rootForm
                });
            }
        }

        // 3. Check existing using root forms
        const snapshot = await wordsCollection.select('text', 'tags').get();
        const existingDataMap = new Map<string, { id: string; tags: string[] }>();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            existingDataMap.set(data.text, {
                id: doc.id,
                tags: Array.isArray(data.tags) ? data.tags : []
            });
        });

        const batch = db.batch();
        let addedCount = 0;
        let skippedCount = 0;
        const now = new Date();
        const newWords: Word[] = [];

        for (const [text, info] of consolidatedInputs) {
            if (existingDataMap.has(text)) {
                // Word exists: Check if we need to merge new tags
                const existing = existingDataMap.get(text)!;
                if (info.tags.length > 0) {
                    const currentTags = new Set(existing.tags);
                    let hasNewTag = false;
                    for (const t of info.tags) {
                        if (!currentTags.has(t)) {
                            currentTags.add(t);
                            hasNewTag = true;
                        }
                    }

                    if (hasNewTag) {
                        const mergedTags = Array.from(currentTags);
                        batch.update(wordsCollection.doc(existing.id), { tags: mergedTags });
                    }
                }
                skippedCount++;
                continue;
            }

            const docRef = wordsCollection.doc();
            const language = isChinese(text) ? 'zh' : 'en';

            const newWord: Word = {
                id: docRef.id,
                text,
                language,
                rootForm: info.rootForm,
                revisedCount: 0,
                correctCount: 0,
                examples: [],
                tags: info.tags,
                createdAt: now
            };
            batch.set(docRef, newWord);
            newWords.push(newWord);
            addedCount++;
        }

        // Commit if we have additions OR updates
        if (addedCount > 0 || consolidatedInputs.size > 0) {
            await batch.commit();
        }

        if (addedCount > 0) {
            // Trigger Background AI Generation via Queue (Persistent)
            newWords.forEach(w => {
                queueService.addToQueue(w.id, w.text, userId, profileId)
                    .catch(err => console.error(`[WordService] Failed to add ${w.text} to queue`, err));
            });

            // Trigger Pronunciation Generation for all new words (Fire and Forget)
            Promise.all(newWords.map(w => pronunciationService.getPronunciation(w.text)))
                .catch(err => console.error("Background pronunciation generation failed", err));
        }

        return { added: addedCount, skipped: skippedCount };
    }

    async deleteWord(userId: string, profileId: string, wordId: string): Promise<void> {
        const wordRef = this.getCollection(userId, profileId).doc(wordId);
        await wordRef.delete();
    }

    async validateWord(text: string): Promise<{ isValid: boolean; rootForm?: string; language: 'en' | 'zh' }> {
        return wordValidationService.validateWord(text);
    }
}

export const wordService = new WordService();
