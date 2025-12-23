
import * as dotenv from 'dotenv';
dotenv.config();

// Mock console.log to see output clearly or just depend on standard output
import { pronunciationService } from '../src/services/pronunciationService';

async function testPronunciation() {
    const testWords = ['Apple', '學校'];

    console.log('--- Starting Pronunciation Test ---');

    for (const word of testWords) {
        console.log(`\nTesting word: ${word}`);
        const result = await pronunciationService.getPronunciation(word);

        if (result) {
            console.log(`SUCCESS: Got pronunciation for "${word}"`);
            console.log(`Audio URL: ${result.audioUrl}`);
            console.log(`Storage Path: ${result.storagePath}`);
            console.log(`Created At: ${new Date(result.createdAt).toISOString()}`);
        } else {
            console.error(`FAILURE: Failed to get pronunciation for "${word}"`);
        }
    }

    console.log('\n--- Retesting to check caching ---');
    // Test caching (should be instant and return same URL - though simple script won't verify timing easily without more logic, logs in service will show)
    const cachedWord = testWords[0];
    await pronunciationService.getPronunciation(cachedWord);

    console.log('\n--- Test Complete ---');
}

testPronunciation().catch(console.error);
