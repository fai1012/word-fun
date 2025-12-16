import { db } from './firestoreService';
import { User, Profile } from '../types';

class AdminService {
    async getAllUsers(): Promise<User[]> {
        const snapshot = await db.collection('users').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                name: data.name,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt),
            } as User;
        });
    }

    async getAllProfiles(): Promise<Profile[]> {
        // collectionGroup 'profiles' allows querying all profile subcollections across all users
        const snapshot = await db.collectionGroup('profiles').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId, // Ensure this is stored in the doc, otherwise we need to parse ref
                displayName: data.displayName,
                avatarId: data.avatarId,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                stats: data.stats || {}
            } as Profile;
        });
    }

    async getAllWords(): Promise<any[]> {
        // collectionGroup 'words' gets ALL words from ALL users
        const snapshot = await db.collectionGroup('words').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            // We might want parent profile info here, but for now just the word data
            return {
                id: doc.id,
                text: data.text,
                language: data.language,
                correctCount: data.correctCount,
                revisedCount: data.revisedCount,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            };
        });
    }

    async getSystemStats(): Promise<any> {
        // Parallel fetch for counts (inefficient for large scale, ok for MVP)
        const usersSnap = await db.collection('users').count().get();
        const profilesSnap = await db.collectionGroup('profiles').count().get();
        const wordsSnap = await db.collectionGroup('words').count().get();

        return {
            totalUsers: usersSnap.data().count,
            totalProfiles: profilesSnap.data().count,
            totalWords: wordsSnap.data().count
        };
    }
}

export const adminService = new AdminService();
