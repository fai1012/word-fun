import * as ff from '@google-cloud/functions-framework';
import { Firestore } from '@google-cloud/firestore';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Firestore
const db = new Firestore({
    databaseId: process.env.FIRESTORE_DB_NAME || 'word-fun',
    ignoreUndefinedProperties: true,
});

// Lazy initialization for GenAI
let genAI: GoogleGenAI | null = null;
function getGenAI() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY not found in environment variables.");
        }
        genAI = new GoogleGenAI({ apiKey });
    }
    return genAI;
}

const DAILY_EXAMPLE_LIMIT = 50;

async function getUserUsage(userId: string): Promise<{ count: number, allowed: boolean }> {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) return { count: 0, allowed: true };

    const userData = doc.data() as any;
    const today = new Date().toISOString().split('T')[0];
    const usage = userData.rateUsage?.exampleGeneration;

    if (!usage || usage.lastResetDate !== today) {
        return { count: 0, allowed: true };
    }

    return {
        count: usage.count,
        allowed: usage.count < DAILY_EXAMPLE_LIMIT
    };
}

async function incrementUserUsage(userId: string) {
    const userRef = db.collection('users').doc(userId);
    const today = new Date().toISOString().split('T')[0];

    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(userRef);
        if (!doc.exists) return;

        const userData = doc.data() as any;
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


/**
 * GENERATOR FUNCTION: Processes all pending items in 'example_generation_queue'.
 * HTTP Triggered.
 */
ff.http('processQueueBatch', async (req: ff.Request, res: ff.Response) => {
    try {
        console.log(`[CloudFunc] Starting batch processing...`);

        // 1. Fetch pending and failed items
        const snapshot = await db.collection('example_generation_queue')
            .where('status', 'in', ['pending', 'failed'])
            .limit(40) // Fetch more to allow filtering attempts
            .get();

        const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const items = allItems
            .filter(item => item.status === 'pending' || (item.status === 'failed' && (item.attempts || 0) < 5))
            .slice(0, 20);

        if (items.length === 0) {
            console.log('[CloudFunc] No items to process.');
            res.status(200).send('No items to process');
            return;
        }

        console.log(`[CloudFunc] Processing ${items.length} items (after filtering attempts)...`);

        // Group by language to optimize AI calls
        const zhItems = items.filter(item => /[\u4e00-\u9fa5]/.test(item.wordText));
        const enItems = items.filter(item => !/[\u4e00-\u9fa5]/.test(item.wordText));

        await Promise.all([
            processLangBatch('zh', zhItems),
            processLangBatch('en', enItems)
        ]);

        res.status(200).send(`Processed ${items.length} items`);

    } catch (error: any) {
        console.error(`[CloudFunc] Batch processing failed:`, error);
        res.status(500).send(error.message);
    }
});

async function processLangBatch(language: 'zh' | 'en', items: any[]) {
    if (items.length === 0) return;

    const wordTexts = items.map(i => i.wordText);
    console.log(`[CloudFunc] Generating examples for ${language} batch: ${wordTexts.join(', ')}`);

    try {
        // Filter items based on usage limit
        const allowedItems = [];
        for (const item of items) {
            const { count, allowed } = await getUserUsage(item.userId);
            if (allowed) {
                allowedItems.push(item);
            } else {
                console.log(`[CloudFunc] Skipping ${item.wordText} for user ${item.userId} - Daily limit reached (${count})`);
                // Leave as pending in queue
            }
        }

        if (allowedItems.length === 0) {
            console.log(`[CloudFunc] No items allowed for ${language} batch processing after usage check.`);
            return;
        }

        const allowedWordTexts = allowedItems.map(i => i.wordText);

        // Fetch context words from first user's profile
        const firstItem = allowedItems[0];
        let contextWords: string[] = [];
        try {
            const wordsColl = db.collection('users').doc(firstItem.userId).collection('profiles').doc(firstItem.profileId).collection('words');
            const contextSnap = await wordsColl.limit(50).get();
            contextWords = contextSnap.docs.map(doc => doc.data().text as string).filter(Boolean);
        } catch (e) {
            console.warn("[CloudFunc] Context fetch failed, skipping context.");
        }

        const prompt = getPromptForLanguage(language, allowedWordTexts, contextWords);
        const result = await getGenAI().models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            character: { type: Type.STRING },
                            examples: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        chinese: { type: Type.STRING }
                                    },
                                    required: ["chinese"]
                                }
                            }
                        },
                        required: ["character", "examples"],
                    },
                },
            },
        });

        const generatedData = JSON.parse(result.text || '[]') as any[];
        const generatedMap = new Map(generatedData.map(d => [d.character, d]));

        const batch = db.batch();

        for (const item of allowedItems) {
            const gen = generatedMap.get(item.wordText);
            if (gen && gen.examples) {
                const examples = gen.examples.map((ex: any) => ({
                    chinese: ex.chinese,
                    english: ''
                }));

                const wordRef = db.collection('users').doc(item.userId).collection('profiles').doc(item.profileId).collection('words').doc(item.wordId);
                batch.update(wordRef, { examples });
                batch.delete(db.collection('example_generation_queue').doc(item.id));

                // Increment usage
                await incrementUserUsage(item.userId);

                console.log(`[CloudFunc] Prepared update and usage increment for ${item.wordText}`);
            } else {
                console.warn(`[CloudFunc] No examples found for ${item.wordText}`);
                const currentAttempts = (item.attempts || 0) + 1;
                batch.update(db.collection('example_generation_queue').doc(item.id), {
                    status: 'failed',
                    error: 'No examples generated',
                    attempts: currentAttempts,
                    updatedAt: new Date()
                });
            }
        }

        await batch.commit();
        console.log(`[CloudFunc] Committed updates for ${language} batch.`);

    } catch (error: any) {
        console.error(`[CloudFunc] Failed to process ${language} batch:`, error);
        // Mark all as failed in this batch
        const failBatch = db.batch();
        for (const item of items) {
            const currentAttempts = (item.attempts || 0) + 1;
            failBatch.update(db.collection('example_generation_queue').doc(item.id), {
                status: 'failed',
                error: error.message,
                attempts: currentAttempts,
                updatedAt: new Date()
            });
        }
        await failBatch.commit();
    }
}

function getPromptForLanguage(language: 'zh' | 'en', words: string[], contextWords: string[] = []): string {
    const filteredContext = contextWords.filter(w => {
        if (language === 'zh') return /[\u4e00-\u9fa5]/.test(w);
        if (language === 'en') return /[a-zA-Z]/.test(w) && !/[\u4e00-\u9fa5]/.test(w);
        return false;
    });

    const contextSection = filteredContext.length > 0 ? `
            EXISTING VOCABULARY CONTEXT (Try to use these words in examples):
            ${filteredContext.join(", ")}` : '';

    if (language === 'zh') {
        return `Generate flashcard content for the following Chinese words.
            
            TARGET WORDS:
            ${JSON.stringify(words)}
            ${contextSection}
            
            REQUIREMENTS:
            1. Target Audience: Hong Kong Primary 1 or Primary 2 students (Age 6-7).
            2. Examples:
               - Create 3 distinct sentences for each word.
               - Sentences must be simple, relatable to a 6-7 year old living in HK.
               - LANGUAGE: STRICTLY Traditional Chinese (Standard Written Chinese / 書面語). 
               - FORBIDDEN: 
                 - NO colloquial Cantonese (口語).
                 - NO English translations inside the content.
                 - NO Pinyin or Jyutping.
                 - NO auxiliary notes or explanations in parentheses.
            3. Return JSON Array.`;
    } else {
        return `Generate flashcard content for the following English words.
            
            TARGET WORDS:
            ${JSON.stringify(words)}
            ${contextSection}
            
            REQUIREMENTS:
            1. Target Audience: Hong Kong Primary 1 or Primary 2 students (Age 6-7).
            2. Examples:
               - Create 3 distinct sentences for each word.
               - Sentences must be simple, relatable to a 6-7 year old living in HK.
               - LANGUAGE: STRICTLY British English.
               - FORBIDDEN: 
                 - NO Chinese translations inside the content.
                 - NO Pinyin or Jyutping romanization.
                 - NO auxiliary notes or explanations in parentheses.
            3. Return JSON Array.`;
    }
}
