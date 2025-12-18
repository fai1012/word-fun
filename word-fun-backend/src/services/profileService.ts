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

            // Calculate Stats (Fetch minimal fields for in-memory aggregation)
            const wordsColl = doc.ref.collection('words');
            const wordsSnapshot = await wordsColl.get();

            let totalZh = 0;
            let learningZh = 0;
            let totalEn = 0;
            let learningEn = 0;
            let masteredWords = 0; // Keep track of global mastery for Level calc

            wordsSnapshot.forEach(wDoc => {
                const wData = wDoc.data();
                const isEn = wData.language === 'en';
                const count = wData.correctCount || 0;
                const isMastered = count >= 6;

                if (isMastered) masteredWords++;

                if (isEn) {
                    totalEn++;
                    if (!isMastered) learningEn++;
                } else {
                    totalZh++;
                    if (!isMastered) learningZh++;
                }
            });

            const totalWords = totalZh + totalEn;


            return {
                id: doc.id,
                userId: userId,
                displayName: data.displayName,
                avatarId: data.avatarId,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                exp: data.exp || 0,
                stats: {
                    totalWords,
                    masteredWords,
                    // Detailed stats
                    totalZh,
                    learningZh,
                    totalEn,
                    learningEn
                }
            } as Profile;
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
            stats: {}
        };

        await profileRef.set(newProfile);
        return newProfile;
    }

    /**
     * updateProfile
     * Updates an existing profile.
     */
    async updateProfile(userId: string, profileId: string, updates: { displayName?: string; avatarId?: string; exp?: number }): Promise<void> {
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
