import { db } from './firestoreService';
import { Word } from '../types';
import { aiService } from './aiService';

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

        // 2. Check for Duplicates (Case-insensitive check could be better, but strict text match for now)
        const duplicateSnapshot = await wordsCollection.where('text', '==', text).limit(1).get();
        if (!duplicateSnapshot.empty) {
            throw new Error('Word already exists');
        }

        const wordsRef = wordsCollection.doc();
        const now = new Date();

        const isChinese = (s: string) => /[\u4e00-\u9fa5]/.test(s);
        const language = isChinese(text) ? 'zh' : 'en';

        const newWord: Word = {
            id: wordsRef.id,
            text,
            language,
            revisedCount: 0,
            correctCount: 0,
            examples,
            tags,
            createdAt: now
        };

        await wordsRef.set(newWord);
        return newWord;
    }

    async getWords(userId: string, profileId: string): Promise<Word[]> {
        const snapshot = await this.getCollection(userId, profileId).orderBy('createdAt', 'asc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                text: data.text,
                language: data.language || 'zh',
                revisedCount: data.revisedCount || 0,
                correctCount: data.correctCount || 0,
                examples: data.examples || [],
                tags: data.tags || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                lastReviewedAt: data.lastReviewedAt?.toDate ? data.lastReviewedAt.toDate() : (data.lastReviewedAt ? new Date(data.lastReviewedAt) : undefined),
                masteredAt: data.masteredAt?.toDate ? data.masteredAt.toDate() : (data.masteredAt ? new Date(data.masteredAt) : undefined)
            } as Word;
        });
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

    async batchAddWords(userId: string, profileId: string, rawWords: string[], tags: string[] = []): Promise<{ added: number; skipped: number }> {
        const wordsCollection = this.getCollection(userId, profileId);

        // 1. Sanitize input
        const uniqueInputs = Array.from(new Set(rawWords.map(w => w.trim()).filter(w => w.length > 0)));
        if (uniqueInputs.length === 0) return { added: 0, skipped: 0 };

        // 2. Check existing (Optimization: fetch all texts to check duplicates locally avoids N reads)
        // We need 'tags' and 'text' to perform merging
        const snapshot = await wordsCollection.select('text', 'tags').get();
        // Map: text -> { id, tags }
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
        let skippedCount = 0; // "Skipped" now mainly means exact duplicate with nothing to merge
        const now = new Date();
        const newWords: Word[] = []; // Capture for AI

        const isChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

        for (const text of uniqueInputs) {
            if (existingDataMap.has(text)) {
                // Word exists: Check if we need to merge new tags
                const existing = existingDataMap.get(text)!;
                if (tags.length > 0) {
                    const currentTags = new Set(existing.tags);
                    let hasNewTag = false;
                    for (const t of tags) {
                        if (!currentTags.has(t)) {
                            currentTags.add(t);
                            hasNewTag = true;
                        }
                    }

                    if (hasNewTag) {
                        const mergedTags = Array.from(currentTags);
                        batch.update(wordsCollection.doc(existing.id), { tags: mergedTags });
                        // We count this as "added" or maybe purely "merged"? 
                        // For user feedback, it's often better to say "processed" or keep existing counters.
                        // Let's count it as skipped for "new words" count, but effectively updated.
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
                revisedCount: 0,
                correctCount: 0,
                examples: [],
                tags,
                createdAt: now
            };
            batch.set(docRef, newWord);
            newWords.push(newWord);
            addedCount++;
        }

        // Commit if we have additions OR updates (batch is used for both)
        if (addedCount > 0 || skippedCount > 0) {
            // Note: skippedCount > 0 could imply updates, but batch.commit() is safe even if empty?
            // Actually firestore batch errors if empty? No, usually fine, but let's be safe:
            // We can check if batch has operations? Firestore SDK doesn't expose `batch._ops`.
            // Ideally we track `updatesCount`. But committing anyway is usually cheap/safe if non-empty logic matches.
            // Simplest: If any new word or any potential update happened.
            // Since we construct the batch inside the loop, we should just commit it.
            await batch.commit();
        }

        if (addedCount > 0) {
            // Trigger Background AI Generation (Fire and Forget)
            // We don't await this so the UI returns immediately
            aiService.generateExamplesForWords(userId, profileId, newWords)
                .catch(err => console.error("Background AI generation failed to start", err));
        }

        return { added: addedCount, skipped: skippedCount };
    }
}

export const wordService = new WordService();
