import { db } from './firestoreService';
import { WordPackData } from '../types';

const COLLECTION_NAME = 'word_packs';

export const wordPackService = {
    async createPack(data: WordPackData): Promise<string> {
        const docRef = await db.collection(COLLECTION_NAME).add({
            ...data,
            isPublished: data.isPublished ?? false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return docRef.id;
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
