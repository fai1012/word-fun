import { db } from './firestoreService';
import { Profile } from '../types';

class ProfileService {
    /**
     * getProfiles
     * Fetches all profiles for a given userId.
     */
    async getProfiles(userId: string): Promise<Profile[]> {
        const snapshot = await db.collection('users').doc(userId).collection('profiles').get();

        const profiles = await Promise.all(snapshot.docs.map(async doc => {
            const data = doc.data();

            try {
                // Calculate Stats using optimized count() aggregations
                const wordsColl = doc.ref.collection('words');
                const [
                    totalCountSnap,
                    masteredTotalCountSnap,
                    totalEnCountSnap,
                    masteredEnCountSnap
                ] = await Promise.all([
                    wordsColl.count().get(),
                    wordsColl.where('correctCount', '>=', 6).count().get(),
                    wordsColl.where('language', '==', 'en').count().get(),
                    wordsColl.where('language', '==', 'en').where('correctCount', '>=', 6).count().get()
                ]);

                const totalWords = totalCountSnap.data().count;
                const masteredWords = masteredTotalCountSnap.data().count;

                const totalEn = totalEnCountSnap.data().count;
                const masteredEn = masteredEnCountSnap.data().count;
                const learningEn = totalEn - masteredEn;

                // zh includes legacy words where language might be undefined
                const totalZh = totalWords - totalEn;
                const masteredZh = masteredWords - masteredEn;
                const learningZh = totalZh - masteredZh;

                return {
                    id: doc.id,
                    userId: userId,
                    displayName: data.displayName,
                    avatarId: data.avatarId,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
                    exp: data.exp || 0,
                    level: data.level || 0,
                    stats: {
                        totalWords,
                        masteredWords,
                        totalZh,
                        learningZh,
                        totalEn,
                        learningEn
                    }
                } as Profile;
            } catch (err) {
                console.error(`[ProfileService] Error processing profile ${doc.id}:`, err);
                // Return a minimal profile object to avoid failing the entire fetch
                return {
                    id: doc.id,
                    userId: userId,
                    displayName: data.displayName,
                    avatarId: data.avatarId,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
                    exp: data.exp || 0,
                    level: data.level || 0,
                    stats: {
                        totalWords: 0,
                        masteredWords: 0,
                        totalZh: 0,
                        learningZh: 0,
                        totalEn: 0,
                        learningEn: 0
                    }
                } as Profile;
            }
        }));

        return profiles;
    }

    /**
     * createProfile
     * Creates a new profile for a user.
     */
    async createProfile(userId: string, displayName: string, avatarId: string): Promise<Profile> {
        const profileRef = db.collection('users').doc(userId).collection('profiles').doc();
        const now = new Date();

        const newProfile: Profile = {
            id: profileRef.id,
            userId,
            displayName,
            avatarId,
            createdAt: now,
            exp: 0,
            level: 0,
            stats: {}
        };

        await profileRef.set(newProfile);
        return newProfile;
    }

    /**
     * updateProfile
     * Updates an existing profile.
     */
    async updateProfile(userId: string, profileId: string, updates: { displayName?: string; avatarId?: string; exp?: number; level?: number }): Promise<void> {
        const profileRef = db.collection('users').doc(userId).collection('profiles').doc(profileId);
        await profileRef.update(updates);
    }

    /**
     * deleteProfile
     * Deletes a profile.
     */
    async deleteProfile(userId: string, profileId: string): Promise<void> {
        const profileRef = db.collection('users').doc(userId).collection('profiles').doc(profileId);

        // Recursively delete the profile document and all its subcollections (like 'words')
        await db.recursiveDelete(profileRef);
    }
}

export const profileService = new ProfileService();
