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

    async getAllWords(search?: string, page: number = 1, limit: number = 50): Promise<{ data: any[], total: number }> {
        // 1. Fetch all users to build a lookup map (ID -> Email/Name)
        // This is necessary because words are subcollections and don't strictly link back to parent metadata in a single query
        const usersSnap = await db.collection('users').get();
        const userMap = new Map<string, { email: string, name: string }>();
        usersSnap.docs.forEach(doc => {
            const d = doc.data();
            userMap.set(doc.id, { email: d.email, name: d.name });
        });

        let allWords: any[] = [];
        let targetUserIds: string[] = [];

        // 2. Filter by Search (User Name/Email) if provided
        if (search) {
            const lowerSearch = search.toLowerCase();
            for (const [id, user] of userMap.entries()) {
                if ((user.name || '').toLowerCase().includes(lowerSearch) || (user.email || '').toLowerCase().includes(lowerSearch)) {
                    targetUserIds.push(id);
                }
            }

            if (targetUserIds.length === 0) {
                return { data: [], total: 0 };
            }
        }

        // 3. Fetch Words
        if (targetUserIds.length > 0) {
            // A. Fetch for specific users
            for (const userId of targetUserIds) {
                // Determine userEmail directly from our map
                const userInfo = userMap.get(userId);

                const profilesSnap = await db.collection('users').doc(userId).collection('profiles').get();
                for (const profileDoc of profilesSnap.docs) {
                    const wordsSnap = await profileDoc.ref.collection('words').get();
                    const words = wordsSnap.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            text: data.text,
                            language: data.language,
                            correctCount: data.correctCount,
                            revisedCount: data.revisedCount,
                            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                            userEmail: userInfo?.email || 'Unknown',
                            userName: userInfo?.name || 'Unknown'
                        };
                    });
                    allWords.push(...words);
                }
            }
        } else {
            // B. Fetch ALL words (No search filter)
            // Note: collectionGroup query doesn't give us the parent User ID easily in the snapshot data 
            // unless we encoded it. However, the ref path is: users/{userId}/profiles/{profileId}/words/{wordId}
            const snapshot = await db.collectionGroup('words').get();

            allWords = snapshot.docs.map(doc => {
                const data = doc.data();

                // Extract userId from path: users/USER_ID/profiles/...
                const pathSegments = doc.ref.path.split('/');
                const userId = pathSegments[1]; // Index 1 is userId
                const userInfo = userMap.get(userId);

                return {
                    id: doc.id,
                    text: data.text,
                    language: data.language,
                    correctCount: data.correctCount,
                    revisedCount: data.revisedCount,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    userEmail: userInfo?.email || 'Unknown',
                    userName: userInfo?.name || 'Unknown'
                };
            });
        }

        // 4. Sort (Optional, but good for pagination consistency - createdAt desc)
        allWords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // 5. Pagination
        const total = allWords.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = allWords.slice(startIndex, endIndex);

        // 6. Populate Pronunciation Data
        const { pronunciationService } = require('./pronunciationService');
        const uniqueTexts = Array.from(new Set(paginatedData.map(w => w.text).filter(t => t)));
        if (uniqueTexts.length > 0) {
            const urlMap = await pronunciationService.getPronunciations(uniqueTexts);
            paginatedData.forEach(w => {
                if (urlMap.has(w.text)) {
                    w.pronunciationUrl = urlMap.get(w.text);
                }
            });
        }

        return {
            data: paginatedData,
            total
        };
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

    async regenerateMissingPronunciations(): Promise<{ totalChecked: number, triggered: number }> {
        console.log('[Admin] Starting mass pronunciation check...');
        const { pronunciationService } = require('./pronunciationService');

        // 1. Scan all words
        // Use collection group query to find all 'words' collections
        const wordsSnapshot = await db.collectionGroup('words').select('text', 'pronunciationUrl').get();

        const uniqueWords = new Set<string>();
        wordsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!data.pronunciationUrl && data.text) {
                uniqueWords.add(data.text);
            }
        });

        console.log(`[Admin] Found ${uniqueWords.size} unique words possibly missing pronunciation URL.`);

        if (uniqueWords.size === 0) {
            return { totalChecked: 0, triggered: 0 };
        }

        // 2. Check existence in Pronunciations collection
        const wordList = Array.from(uniqueWords);
        const existingMap = await pronunciationService.getPronunciations(wordList);

        const missingWords = wordList.filter(w => !existingMap.has(w));

        console.log(`[Admin] ${missingWords.length} words are truly missing pronunciation audio.`);

        // 3. Trigger generation
        for (const word of missingWords) {
            pronunciationService.getPronunciation(word)
                .catch((e: any) => console.error(`Failed to generate for ${word}`, e));
        }

        return {
            totalChecked: wordsSnapshot.size,
            triggered: missingWords.length
        };
    }
}

export const adminService = new AdminService();
