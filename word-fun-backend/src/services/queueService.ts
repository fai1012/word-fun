import { db } from './firestoreService';
import { QueueItem, Word } from '../types';
import { aiService } from './aiService';
import { wordService } from './wordService';

const COLLECTION_NAME = 'example_generation_queue';

export const queueService = {
    /**
     * Adds a word to the generation queue if it's not already there.
     */
    async addToQueue(wordId: string, wordText: string, userId: string, profileId: string): Promise<void> {
        // 1. Check if already exists in queue (pending or processing)
        const existingSnapshot = await db.collection(COLLECTION_NAME)
            .where('wordId', '==', wordId)
            // .where('status', 'in', ['pending', 'processing']) // 'in' query limitations might apply, let's keep it simple
            .get();

        const activeItem = existingSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.status === 'pending' || data.status === 'processing';
        });

        if (activeItem) {
            const data = activeItem.data();
            console.log(`[Queue] Word ${wordText} (${wordId}) is already in queue (Status: ${data.status}). Skipping.`);
            return;
        }

        // 2. Add to queue
        const newItem: QueueItem = {
            wordId,
            wordText,
            userId,
            profileId,
            status: 'pending',
            createdAt: new Date(),
            attempts: 0
        };

        await db.collection(COLLECTION_NAME).add(newItem);
        console.log(`[Queue] Added ${wordText} (${wordId}) to queue.`);

        // 3. Trigger processing (non-blocking)
        this.processQueue().catch(err => console.error("Queue processing error", err));
    },

    /**
     * Processes pending items in the queue.
     * This should ideally be a Cloud Function or separate worker, 
     * but for this architecture, we run it as a background task.
     */
    /**
     * Processes pending items in the queue.
     */
    async processQueue(): Promise<void> {
        try {
            // 1. Recover stuck items
            // If an item has been 'processing' for more than 5 minutes, it likely failed silently
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const stuckSnapshot = await db.collection(COLLECTION_NAME)
                .where('status', '==', 'processing')
                .where('startedAt', '<', fiveMinutesAgo)
                .get();

            if (!stuckSnapshot.empty) {
                console.log(`[Queue] Recovering ${stuckSnapshot.size} stuck items...`);
                const recoverBatch = db.batch();
                stuckSnapshot.docs.forEach(doc => {
                    recoverBatch.update(doc.ref, {
                        status: 'pending',
                        error: 'Stuck processing (timeout)',
                        startedAt: null
                    });
                });
                await recoverBatch.commit();
            }

            // 2. Fetch pending items
            // NOTE: orderBy('createdAt') requires a composite index: status ASC, createdAt ASC
            // If the index is missing, this query will fail. 
            // We wrap it in a try-catch to allow the system to function even if index is missing (falling back to unordered or just failing gracefully).
            const snapshot = await db.collection(COLLECTION_NAME)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'asc')
                .limit(5)
                .get();

            if (snapshot.empty) return;

            console.log(`[Queue] Processing ${snapshot.size} items...`);

            const batch = db.batch();
            const itemsToProcess: { docId: string; data: QueueItem }[] = [];

            for (const doc of snapshot.docs) {
                const data = doc.data() as QueueItem;
                batch.update(doc.ref, { status: 'processing', startedAt: new Date() });
                itemsToProcess.push({ docId: doc.id, data });
            }
            await batch.commit();

            // Process each (sequentially to avoid overwhelming AI/Firestore)
            for (const item of itemsToProcess) {
                await this.processItem(item.docId, item.data);
            }

            // 3. Self-trigger if we processed a full batch (there might be more)
            if (snapshot.size === 5) {
                console.log("[Queue] Full batch processed, triggering next batch...");
                this.processQueue().catch(err => console.error("[Queue] Recursive trigger error", err));
            }

        } catch (error: any) {
            console.error("[Queue] processQueue failed:", error);
            // If we get an index error, we might want to log it specifically
            if (error.message?.includes('FAILED_PRECONDITION')) {
                console.error("[Queue] CRITICAL: Missing Firestore Index for queue query. Please visit the Firebase console to create it.");
            }
        }
    },


    /**
     * Resets all 'failed' items to 'pending' status so they can be retried.
     */
    /**
     * Resets all 'failed' items to 'pending' status so they can be retried.
     * Optionally filtered by userId (if passed).
     */
    async retryFailedItems(userId?: string): Promise<number> {
        let query = db.collection(COLLECTION_NAME).where('status', '==', 'failed');

        if (userId) {
            query = query.where('userId', '==', userId);
        }

        const snapshot = await query.get();

        if (snapshot.empty) return 0;

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                status: 'pending',
                attempts: 0,
                error: null,
                createdAt: new Date(),
                startedAt: null
            });
        });

        await batch.commit();
        console.log(`[Queue] Resetted ${snapshot.size} failed items${userId ? ` for user ${userId}` : ''}`);

        // Trigger processing immediately
        this.processQueue().catch(err => console.error("[Queue] Error triggering after retry", err));

        return snapshot.size;
    },

    /**
     * Returns all items in the queue (for admin view).
     */
    async getAllQueueItems(): Promise<any[]> {
        const snapshot = await db.collection(COLLECTION_NAME)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    /**
     * Manually triggers the queue processing worker.
     */
    async triggerProcessQueue(): Promise<void> {
        console.log("[Queue] Manual trigger received");
        await this.processQueue();
    },

    async processItem(docId: string, item: QueueItem) {
        try {
            const dummyWord: Word = {
                id: item.wordId,
                text: item.wordText,
                language: /[\u4e00-\u9fa5]/.test(item.wordText) ? 'zh' : 'en',
                revisedCount: 0,
                correctCount: 0,
                examples: [],
                createdAt: new Date(),
            };

            await aiService.generateExamplesForWords(item.userId, item.profileId, [dummyWord]);

            await db.collection(COLLECTION_NAME).doc(docId).delete();
            console.log(`[Queue] Completed & Removed ${item.wordText}`);

        } catch (error: any) {
            console.error(`[Queue] Failed to process ${item.wordText}`, error);

            const attempts = (item.attempts || 0) + 1;
            if (attempts >= 3) {
                await db.collection(COLLECTION_NAME).doc(docId).update({
                    status: 'failed',
                    error: error.message,
                    attempts,
                    startedAt: null
                });
            } else {
                console.log(`[Queue] Retrying ${item.wordText} later (Attempt ${attempts})`);
                await db.collection(COLLECTION_NAME).doc(docId).update({
                    status: 'pending',
                    attempts,
                    error: error.message,
                    createdAt: new Date(),
                    startedAt: null
                });
            }
        }
    }
};
