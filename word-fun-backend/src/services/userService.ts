import { db } from './firestoreService';
import { User } from '../types';

const COLLECTION_NAME = 'users';

class UserService {
    /**
     * Syncs a user: checks if they exist, creates them if not.
     * Updates lastLoginAt on every sync.
     */
    async syncUser(userId: string, email?: string, name?: string, photoURL?: string): Promise<User> {
        const userRef = db.collection(COLLECTION_NAME).doc(userId);
        const doc = await userRef.get();

        const now = new Date();

        if (!doc.exists) {
            // Create new user
            const newUser: User = {
                id: userId,
                email,
                name,
                photoURL,
                createdAt: now,
                lastLoginAt: now,
                isAdmin: false,
                language: 'zh',
            };
            await userRef.set(newUser);
            return newUser;
        } else {
            // Update existing user's last login and metadata
            const updates: Partial<User> = { lastLoginAt: now };
            if (email) updates.email = email;
            if (name) updates.name = name;
            if (photoURL) updates.photoURL = photoURL;

            await userRef.update(updates);

            // Return current data
            const userData = (await userRef.get()).data() as User;
            return userData;
        }
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<void> {
        await db.collection(COLLECTION_NAME).doc(userId).update(updates);
    }

    async getUsage(userId: string): Promise<{ count: number, allowed: boolean }> {
        const userRef = db.collection(COLLECTION_NAME).doc(userId);
        const doc = await userRef.get();
        if (!doc.exists) return { count: 0, allowed: true };

        const userData = doc.data() as User;
        const today = new Date().toISOString().split('T')[0];
        const usage = userData.rateUsage?.exampleGeneration;

        if (!usage || usage.lastResetDate !== today) {
            return { count: 0, allowed: true };
        }

        const { DAILY_EXAMPLE_LIMIT } = require('../config');
        return {
            count: usage.count,
            allowed: usage.count < DAILY_EXAMPLE_LIMIT
        };
    }

    async incrementUsage(userId: string): Promise<void> {
        const userRef = db.collection(COLLECTION_NAME).doc(userId);
        const today = new Date().toISOString().split('T')[0];

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            if (!doc.exists) return;

            const userData = doc.data() as User;
            const usage = userData.rateUsage?.exampleGeneration;

            if (!usage || usage.lastResetDate !== today) {
                transaction.update(userRef, {
                    'rateUsage.exampleGeneration': {
                        lastResetDate: today,
                        count: 1
                    }
                });
            } else {
                transaction.update(userRef, {
                    'rateUsage.exampleGeneration.count': usage.count + 1
                });
            }
        });
    }
}

export const userService = new UserService();
