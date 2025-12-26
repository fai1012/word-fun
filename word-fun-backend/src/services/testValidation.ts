import { wordValidationService } from './wordValidationService';

async function test() {
    const words = [
        'running',    // Valid
        'dogs',       // Valid
        'flies',      // Valid
        'kengaroo',   // Invalid (misspelled)
        'kangaroo',   // Valid
        'qwrtp',      // Invalid (no vowels)
        'a',          // Valid (single letter)
        'b',          // Invalid (single letter)
        'apple!!!',   // Invalid (format)
        '飛機',        // Valid (zh)
        '12345',      // Invalid (format)
        'th'          // Invalid (no vowels, length 2, but 'th' is common... wait, 'th' is not a word)
    ];
    for (const word of words) {
        const result = await wordValidationService.validateWord(word);
        console.log(`Word: [${word}] -> isValid: ${result.isValid}, rootForm: ${result.rootForm}, language: ${result.language}`);
    }
}

test();
