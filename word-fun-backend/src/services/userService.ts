import { db } from './firestoreService';
import { User } from '../types';

const COLLECTION_NAME = 'users';

class UserService {
    /**
     * Syncs a user: checks if they exist, creates them if not.
     * Updates lastLoginAt on every sync.
     */
    async syncUser(userId: string, email?: string, name?: string): Promise<User> {
        const userRef = db.collection(COLLECTION_NAME).doc(userId);
        const doc = await userRef.get();

        const now = new Date();

        if (!doc.exists) {
            // Create new user
            const newUser: User = {
                id: userId,
                email,
                name,
                createdAt: now,
                lastLoginAt: now,
                isAdmin: false,
            };
            await userRef.set(newUser);
            return newUser;
        } else {
            // Update existing user's last login and metadata
            const updates: Partial<User> = { lastLoginAt: now };
            if (email) updates.email = email;
            if (name) updates.name = name;

            await userRef.update(updates);

            // Return current data (casting simply here, in prod we might validate)
            const userData = doc.data() as User;
            // Ensure runtime dates are Date objects if coming from timestamp
            return {
                ...userData,
                lastLoginAt: now
            };
        }
    }
}

export const userService = new UserService();
