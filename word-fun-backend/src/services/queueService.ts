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
    async processQueue(): Promise<void> {
        // Lock/Flag to prevent concurrent processing of the same queue locally could be good, 
        // but Firestore transactions handle the data integrity. 
        // We'll just fetch a batch of pending items.

        const snapshot = await db.collection(COLLECTION_NAME)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(5) // Process 5 at a time
            .get();

        if (snapshot.empty) return;

        console.log(`[Queue] Processing ${snapshot.size} items...`);

        const batch = db.batch();
        const itemsToProcess: { docId: string; data: QueueItem }[] = [];

        // optimize: mark as processing first
        for (const doc of snapshot.docs) {
            const data = doc.data() as QueueItem;
            batch.update(doc.ref, { status: 'processing', startedAt: new Date() });
            itemsToProcess.push({ docId: doc.id, data });
        }
        await batch.commit();

        // Process each
        for (const item of itemsToProcess) {
            this.processItem(item.docId, item.data); // Run in parallel or sequence? Sequence to be safe on API limits
        }
    },

    async processItem(docId: string, item: QueueItem) {
        try {
            // Re-construct minimal Word object for aiService
            // We might need to fetch the full word to check if it still exists or has examples now?
            // aiService.generateExamplesForWords expects Word objects.

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

            // Success: Remove from queue or mark completed
            // User requested persistence, but for a queue, usually "completed" means "done".
            // We can delete it to keep the collection small, or keep it for history.
            // Let's delete it for now to keep it clean, as "if word is still in queue" check implies existence = pending.
            await db.collection(COLLECTION_NAME).doc(docId).delete();
            console.log(`[Queue] Completed & Removed ${item.wordText}`);

        } catch (error: any) {
            console.error(`[Queue] Failed to process ${item.wordText}`, error);

            // Handle retry logic?
            const attempts = (item.attempts || 0) + 1;
            if (attempts >= 3) {
                await db.collection(COLLECTION_NAME).doc(docId).update({
                    status: 'failed',
                    error: error.message,
                    attempts
                });
            } else {
                // Back to pending for retry, AND move to back of queue
                console.log(`[Queue] Retrying ${item.wordText} later (Attempt ${attempts})`);
                await db.collection(COLLECTION_NAME).doc(docId).update({
                    status: 'pending',
                    attempts,
                    error: error.message,
                    createdAt: new Date() // Move to back of queue
                });
            }
        }
    }
};
