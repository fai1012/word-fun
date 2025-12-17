import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../types";
import { wordService } from "./wordService";

class AIService {
    private client: GoogleGenAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            console.warn("WARNING: GEMINI_API_KEY or API_KEY not found in environment variables. AI features will fail.");
        }
        this.client = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
    }

    private getPromptForLanguage(language: 'zh' | 'en', words: string[], contextWords: string[] = []): string {
        const contextSection = contextWords.length > 0 ? `
                EXISTING VOCABULARY CONTEXT (Try to use these words in examples):
                ${contextWords.join(", ")}` : '';

        if (language === 'zh') {
            return `Generate flashcard content for the following Chinese words.
                
                TARGET WORDS:
                ${JSON.stringify(words)}
                ${contextSection}
                
                REQUIREMENTS:
                1. Target Audience: Hong Kong Primary 1 or Primary 2 students.
                2. Examples:
                   - Create 3 distinct sentences for each word.
                   - Sentences must be simple, relatable to a 6-7 year old living in HK.
                   - LANGUAGE: Traditional Chinese (Standard Written Chinese / 書面語). NO colloquial Cantonese (口語).
                3. Return JSON Array.`;
        } else {
            return `Generate flashcard content for the following English words.
                
                TARGET WORDS:
                ${JSON.stringify(words)}
                ${contextSection}
                
                REQUIREMENTS:
                1. Target Audience: Hong Kong Primary 1 or Primary 2 students.
                2. Examples:
                   - Create 3 distinct sentences for each word.
                   - Sentences must be simple, relatable to a 6-7 year old living in HK.
                   - LANGUAGE: English Only. Do NOT provide Chinese translations.
                3. Return JSON Array.`;
        }
    }

    async generateExamplesForWords(userId: string, profileId: string, words: Word[]): Promise<void> {
        if (words.length === 0) return;

        console.log(`[AI] Starting background generation for ${words.length} words...`);
        const startTime = Date.now();

        // Group by language
        const wordsByLang = {
            zh: words.filter(w => w.language === 'zh'),
            en: words.filter(w => w.language === 'en')
        };

        try {
            for (const lang of ['zh', 'en'] as const) {
                const langWords = wordsByLang[lang];
                if (langWords.length === 0) continue;

                const batchCharacters = langWords.map(w => w.text);

                const prompt = this.getPromptForLanguage(lang, batchCharacters);
                console.log(`[AI] Generating Content for ${lang} with prompt:\n${prompt}`);

                const aiResponse = await this.client.models.generateContent({
                    model: 'gemini-2.5-flash',
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
                                                chinese: { type: Type.STRING } // We use 'chinese' key for the content regardless of language for schema simplicity
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

                if (aiResponse.text) {
                    let cleanJson = aiResponse.text.trim();
                    if (cleanJson.startsWith('```json')) {
                        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                    } else if (cleanJson.startsWith('```')) {
                        cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
                    }

                    const generatedData = JSON.parse(cleanJson) as any[];
                    const generatedMap = new Map(generatedData.map(d => [d.character, d]));

                    for (const word of langWords) {
                        const gen = generatedMap.get(word.text);
                        if (gen && gen.examples && Array.isArray(gen.examples)) {
                            await wordService.updateWord(userId, profileId, word.id, {
                                examples: gen.examples.map((ex: any) => ({ chinese: ex.chinese, english: '' }))
                            });
                            console.log(`[AI] Updated examples for ${word.text} (${lang})`);
                        }
                    }
                }
            }

            const duration = Date.now() - startTime;
            console.log(`[AI] Completed generation for ${words.length} words in ${duration}ms`);

        } catch (err) {
            console.error("[AI] Background generation failed:", err);
        }
    }

    async generateSessionContent(words: Word[], contextWords: string[]): Promise<Word[]> {
        console.log(`[AI] Generating session content for ${words.length} words...`);

        // Group by language to process properly
        const wordsByLang = {
            zh: words.filter(w => w.language === 'zh' || !w.language), // Default to zh if missing
            en: words.filter(w => w.language === 'en')
        };

        const resultWords = [...words];

        try {
            for (const lang of ['zh', 'en'] as const) {
                const langWords = wordsByLang[lang];
                if (langWords.length === 0) continue;

                const batchCharacters = langWords.map(w => w.text);

                const prompt = this.getPromptForLanguage(lang, batchCharacters, contextWords);
                console.log(`[AI] Generating Session Content for ${lang} with prompt:\n${prompt}`);

                const aiResponse = await this.client.models.generateContent({
                    model: 'gemini-2.5-flash',
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

                if (aiResponse.text) {
                    const generatedData = JSON.parse(aiResponse.text.trim()) as any[];
                    const generatedMap = new Map(generatedData.map(d => [d.character, d]));

                    // Update resultWords in place
                    for (let i = 0; i < resultWords.length; i++) {
                        if (resultWords[i].language === lang || (!resultWords[i].language && lang === 'zh')) {
                            const gen = generatedMap.get(resultWords[i].text);
                            if (gen) {
                                resultWords[i] = {
                                    ...resultWords[i],
                                    examples: gen.examples.map((ex: any) => ({ chinese: ex.chinese, english: '' }))
                                };
                            }
                        }
                    }
                }
            }

            return resultWords;

        } catch (err) {
            console.error("[AI] Session generation failed:", err);
            throw err;
        }
    }

    async generateSingleExample(word: string, existingExamples: string[], contextWords: string[] = []): Promise<string> {
        console.log(`[AI] Generating single example for ${word} with ${contextWords.length} context words...`);
        const isChinese = /[\u4e00-\u9fa5]/.test(word);

        const contextSection = contextWords.length > 0 ? `
                EXISTING VOCABULARY CONTEXT (Try to use these words if natural):
                ${contextWords.join(", ")}` : '';

        try {
            let prompt = '';
            if (isChinese) {
                prompt = `Generate ONE new Chinese example sentence for the word "${word}".
                
                ${contextSection}

                EXISTING EXAMPLES (Do not repeat these):
                ${existingExamples.map(ex => `- ${ex}`).join('\n')}
                
                REQUIREMENTS:
                1. Target Audience: Hong Kong Primary 1 or Primary 2 students (Age 6-7).
                2. Content: Simple, relatable to daily life in HK.
                3. Length: Short sentence (5-10 words preferred).
                4. Language: Traditional Chinese (Standard Written Chinese / 書面語). NO colloquial Cantonese.
                5. Output: JUST the sentence string. No JSON, no Pinyin, no English.`;
            } else {
                prompt = `Generate ONE new English example sentence for the word "${word}".

                ${contextSection}
                
                EXISTING EXAMPLES (Do not repeat these):
                ${existingExamples.map(ex => `- ${ex}`).join('\n')}
                
                REQUIREMENTS:
                1. Target Audience: Hong Kong Primary 1 or Primary 2 students (Age 6-7).
                2. Content: Simple, relatable to daily life in HK.
                3. Length: Short sentence (5-10 words preferred).
                4. Language: English.
                5. Output: JUST the sentence string. No JSON.`;
            }

            console.log(`[AI] Generating Single Example with prompt:\n${prompt}`);

            const aiResponse = await this.client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            if (aiResponse.text) {
                return aiResponse.text.trim().replace(/^"|"$/g, '');
            }
            throw new Error("No text returned from AI");
        } catch (err) {
            console.error("[AI] Single example generation failed:", err);
            throw err;
        }
    }
}

export const aiService = new AIService();
