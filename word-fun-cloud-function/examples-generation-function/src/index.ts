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
    // UTC+8
    const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
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
    // UTC+8
    const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];

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

function getRetryDelayMinutes(attempts: number): number {
    if (attempts <= 1) return 1;
    if (attempts <= 5) return Math.round(1 + (attempts - 1) * (14 / 4)); // 1, 5, 8, 12, 15
    if (attempts <= 10) return Math.round(15 + (attempts - 5) * (45 / 5)); // 15, 24, 33, 42, 51, 60
    return 60;
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
            .filter(item => {
                if (item.status === 'pending') return true;
                if (item.status === 'failed') {
                    const attempts = item.attempts || 0;
                    const updatedAt = item.updatedAt?.toDate() || new Date(0);
                    const waitMillis = getRetryDelayMinutes(attempts) * 60 * 1000;
                    return (Date.now() - updatedAt.getTime()) >= waitMillis;
                }
                return false;
            })
            .slice(0, 20);

        if (items.length === 0) {
            console.log('[CloudFunc] No items to process.');
            res.status(200).send('No items to process');
            return;
        }

        console.log(`[CloudFunc] Processing ${items.length} items (after filtering attempts)...`);

        // LOCKING: Claim items to avoid race conditions (e.g. manual trigger vs schedule vs duplicate triggers)
        const lockResults = await Promise.all(items.map(async (item) => {
            try {
                return await db.runTransaction(async (t) => {
                    const ref = db.collection('example_generation_queue').doc(item.id);
                    const doc = await t.get(ref);
                    if (!doc.exists) return null;
                    const data = doc.data();
                    // Ensure status hasn't changed (e.g. already picked up)
                    if (data?.status !== item.status) return null;

                    t.update(ref, { status: 'processing', processingStartedAt: new Date() });
                    return { ...item, status: 'processing' };
                });
            } catch (e) {
                console.warn(`[CloudFunc] Failed to lock item ${item.id}:`, e);
                return null;
            }
        }));

        const lockedItems = lockResults.filter((i): i is any => i !== null);

        if (lockedItems.length === 0) {
            console.log('[CloudFunc] No items successfully locked (race condition prevented).');
            res.status(200).send('No items locked');
            return;
        }

        // Group by language to optimize AI calls
        const zhItems = lockedItems.filter(item => /[\u4e00-\u9fa5]/.test(item.wordText));
        const enItems = lockedItems.filter(item => !/[\u4e00-\u9fa5]/.test(item.wordText));

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

const fs = require('fs');
const path = require('path');

let globalVocabulary: string[] = [];
try {
    const vocabPath = path.join(__dirname, 'vocabulary.json');
    if (fs.existsSync(vocabPath)) {
        const data = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            globalVocabulary = data.map((item: any) => item.char).filter(Boolean);
        } else if (Array.isArray(data)) {
            globalVocabulary = data as string[];
        }
        console.log(`[CloudFunc] Loaded ${globalVocabulary.length} words from vocabulary.json`);
    } else {
        console.warn("[CloudFunc] vocabulary.json not found.");
    }
} catch (e) {
    console.error("[CloudFunc] Failed to load vocabulary.json:", e);
}

async function processLangBatch(language: 'zh' | 'en', items: any[]) {
    if (items.length === 0) return;

    const wordTexts = items.map(i => i.wordText);
    console.log(`[CloudFunc] Generating examples for ${language} batch: ${wordTexts.join(', ')}`);

    try {
        // Filter items based on usage limit
        const allowedItems = [];
        const skippedItems = [];
        for (const item of items) {
            const { count, allowed } = await getUserUsage(item.userId);
            if (allowed) {
                allowedItems.push(item);
            } else {
                console.log(`[CloudFunc] Skipping ${item.wordText} for user ${item.userId} - Daily limit reached (${count})`);
                skippedItems.push(item);
            }
        }

        if (skippedItems.length > 0) {
            const skipBatch = db.batch();
            skippedItems.forEach(item => {
                // Revert to pending so it can be retried later (next day)
                skipBatch.update(db.collection('example_generation_queue').doc(item.id), { status: 'pending' });
            });
            await skipBatch.commit();
        }

        if (allowedItems.length === 0) {
            console.log(`[CloudFunc] No items allowed for ${language} batch processing after usage check.`);
            return;
        }

        const allowedWordTexts = allowedItems.map(i => i.wordText);

        // Fetch context words from first user's profile (Preferred Vocabulary)
        const firstItem = allowedItems[0];
        let preferredWords: string[] = [];
        try {
            const wordsColl = db.collection('users').doc(firstItem.userId).collection('profiles').doc(firstItem.profileId).collection('words');
            const contextSnap = await wordsColl.select('text').get();
            preferredWords = contextSnap.docs.map(doc => doc.data().text as string).filter(Boolean);
            // Remove duplicates
            preferredWords = [...new Set(preferredWords)];
        } catch (e) {
            console.warn("[CloudFunc] Context fetch failed, skipping user context.");
        }

        // Prepare Allowed Characters List (Global + Preferred Chars) for Chinese
        let allowedCharSet = new Set<string>();
        if (language === 'zh') {
            // Add Global Vocabulary (Chars)
            globalVocabulary.forEach(c => allowedCharSet.add(c));
            // Add characters from Preferred Words
            preferredWords.forEach(word => {
                for (const char of word) {
                    if (/[\u4e00-\u9fa5]/.test(char)) {
                        allowedCharSet.add(char);
                    }
                }
            });
        }

        const prompt = getPromptForLanguage(language, allowedWordTexts, preferredWords, Array.from(allowedCharSet));
        const result = await getGenAI().models.generateContent({
            model: 'gemini-3.5-flash',
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
                // VALIDATION START
                if (language === 'zh') {
                    for (const ex of gen.examples) {
                        const sentence = ex.chinese || '';
                        const invalidChars: string[] = [];
                        for (const char of sentence) {
                            // Check if char is Chinese and NOT in allowed list
                            if (/[\u4e00-\u9fa5]/.test(char) && !allowedCharSet.has(char)) {
                                invalidChars.push(char);
                            }
                        }
                        if (invalidChars.length > 0) {
                            console.warn(`[CloudFunc] Strictness Violation for word '${item.wordText}': Sentence "${sentence}" contains forbidden chars: [${invalidChars.join(', ')}]`);
                        }
                    }
                }
                // VALIDATION END

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

function getPromptForLanguage(language: 'zh' | 'en', words: string[], preferredWords: string[] = [], allowedChars: string[] = []): string {
    // Filter preferred words by language for better context
    const filteredPreferred = preferredWords.filter(w => {
        if (language === 'zh') return /[\u4e00-\u9fa5]/.test(w);
        if (language === 'en') return /[a-zA-Z]/.test(w) && !/[\u4e00-\u9fa5]/.test(w);
        return false;
    });

    const preferredSection = filteredPreferred.length > 0 ? `
            OPTIONAL CONTEXT VOCABULARY (Use these ONLY if they fit naturally and help the sentence flow. DO NOT force them in):
            ${filteredPreferred.join(", ")}` : '';

    if (language === 'zh') {
        const allowedCharsString = allowedChars.join("");

        return `Generate flashcard content for the following Chinese words.
            
            TARGET WORDS:
            ${JSON.stringify(words)}
            ${preferredSection}
            
            ALLOWED CHARACTERS LIST:
            ${allowedCharsString}
            
            REQUIREMENTS:
            1. Target Audience: Hong Kong Primary 1 or Primary 2 students (Age 6-7).
            3. Examples:
               - Create 3 distinct sentences for each word.
               - Sentences must be COMPLETE and DESCRIPTIVE (Subject + Verb + Object). Avoid simple fragments like "我快活".
               - Minimum length: 6 characters per sentence.
               - LANGUAGE: STRICTLY Traditional Chinese (Standard Written Chinese / 書面語). 
                 - DO NOT use Cantonese colloquialisms (like 佢, 哋, 嘅, 咗, 係, 咁) even if the context is HK. Use standard equivalents (他, 他們, 的, 了, 是, 這麼) ONLY if they are in the allowed list.
               - STRICT CONSTRAINT: You MUST construct sentences using ONLY the characters from the "ALLOWED CHARACTERS LIST" above. 
               - EXCEPTION: You may use standard punctuation (，。？！) and numbers (1, 2, 3...) which are not in the list.
               - FORBIDDEN: 
                 - NO characters outside the allowed list (except punctuation/numbers).
                 - NO English translations inside the content.
                 - NO Pinyin or Jyutping.
                 - NO auxiliary notes or explanations in parentheses.
            3. Return JSON Array.`;
    } else {
        return `Generate flashcard content for the following English words.
            
            TARGET WORDS:
            ${JSON.stringify(words)}
            ${preferredSection}
            
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
