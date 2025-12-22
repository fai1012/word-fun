import { db } from './firestoreService';
import { WordPackData } from '../types';

const COLLECTION_NAME = 'word_packs';

export const wordPackService = {
    async createPack(data: WordPackData): Promise<string> {
        const docRef = await db.collection(COLLECTION_NAME).add({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return docRef.id;
    },

    async getAllPacks(): Promise<any[]> {
        const snapshot = await db.collection(COLLECTION_NAME).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
            };
        });
    },

    async getPackById(id: string): Promise<any> {
        const doc = await db.collection(COLLECTION_NAME).doc(id).get();
        if (!doc.exists) return null;
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt
        };
    },

    async updatePack(id: string, data: WordPackData): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(id).update({
            ...data,
            updatedAt: new Date()
        });
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
    }
};
