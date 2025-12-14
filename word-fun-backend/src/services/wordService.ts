import { db } from './firestoreService';
import { Word } from '../types';
import { aiService } from './aiService';

class WordService {
    private getCollection(userId: string, profileId: string) {
        return db.collection('users').doc(userId).collection('profiles').doc(profileId).collection('words');
    }

    async addWord(userId: string, profileId: string, text: string, examples: string[] = []): Promise<Word> {
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
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                lastReviewedAt: data.lastReviewedAt?.toDate ? data.lastReviewedAt.toDate() : (data.lastReviewedAt ? new Date(data.lastReviewedAt) : undefined),
                masteredAt: data.masteredAt?.toDate ? data.masteredAt.toDate() : (data.masteredAt ? new Date(data.masteredAt) : undefined)
            } as Word;
        });
    }

    async updateWord(userId: string, profileId: string, wordId: string, updates: Partial<Pick<Word, 'revisedCount' | 'correctCount' | 'examples' | 'lastReviewedAt' | 'masteredAt'>>): Promise<void> {
        const wordRef = this.getCollection(userId, profileId).doc(wordId);
        await wordRef.update(updates);
    }

    async batchAddWords(userId: string, profileId: string, rawWords: string[]): Promise<{ added: number; skipped: number }> {
        const wordsCollection = this.getCollection(userId, profileId);

        // 1. Sanitize input
        const uniqueInputs = Array.from(new Set(rawWords.map(w => w.trim()).filter(w => w.length > 0)));
        if (uniqueInputs.length === 0) return { added: 0, skipped: 0 };

        // 2. Check existing (Optimization: fetch all texts to check duplicates locally avoids N reads)
        const snapshot = await wordsCollection.select('text').get();
        const existingTexts = new Set(snapshot.docs.map(doc => doc.data().text));

        const batch = db.batch();
        let addedCount = 0;
        let skippedCount = 0;
        const now = new Date();
        const newWords: Word[] = []; // Capture for AI

        const isChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

        for (const text of uniqueInputs) {
            if (existingTexts.has(text)) {
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
                createdAt: now
            };
            batch.set(docRef, newWord);
            newWords.push(newWord);
            addedCount++;
        }

        if (addedCount > 0) {
            await batch.commit();

            // Trigger Background AI Generation (Fire and Forget)
            // We don't await this so the UI returns immediately
            aiService.generateExamplesForWords(userId, profileId, newWords)
                .catch(err => console.error("Background AI generation failed to start", err));
        }

        return { added: addedCount, skipped: skippedCount };
    }
}

export const wordService = new WordService();
