
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Firestore } from '@google-cloud/firestore';

// Load environment variables
dotenv.config();

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const KEY_FILE_CONTENT = process.env.GCP_SERVICE_ACCOUNT_KEY;
const DATABASE_ID = process.env.FIRESTORE_DB_NAME || 'word-fun';

if (!PROJECT_ID || !KEY_FILE_CONTENT) {
    console.error('Missing GCP_PROJECT_ID or GCP_SERVICE_ACCOUNT_KEY in .env');
    process.exit(1);
}

// Initialize Firestore
let credentials;
try {
    credentials = JSON.parse(KEY_FILE_CONTENT);
} catch (error) {
    console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY', error);
    process.exit(1);
}

const db = new Firestore({
    projectId: PROJECT_ID,
    credentials: credentials,
    databaseId: DATABASE_ID,
    ignoreUndefinedProperties: true
});

const USER_ID = '101015930962834978394';
const PROFILE_ID = 'lUap7DDn6tUVTGE0lore';
const CSV_FILE_PATH = path.resolve(__dirname, '../../Flashcard - Hazel.csv');

interface Example {
    chinese: string;
    english: string;
}

interface ParsedWord {
    word: string;
    revised: number;
    correct: number;
    examples: Example[];
}

function parseCSVLine(line: string): ParsedWord | null {
    // Basic CSV parser that handles quoted fields with escaped quotes
    // Expected format: Word,Revised,Correct,"{JSON}"

    // We can't just split by comma because the JSON contains commas.
    // Regex to match fields: either non-commas, or quoted strings (handling escaped quotes)
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    // Actually, a simpler regex might be better if we assume standard CSV structure
    // This regex matches: (quoted string) OR (non-comma string)
    // followed by a comma or end of line.

    // Let's rely on the specific structure: 
    // The first 3 fields are simple. Validated by looking at the file.
    // The last field is a quoted JSON string.

    // Find the first three commas
    let firstComma = line.indexOf(',');
    let secondComma = line.indexOf(',', firstComma + 1);
    let thirdComma = line.indexOf(',', secondComma + 1);

    if (firstComma === -1 || secondComma === -1 || thirdComma === -1) {
        // Some lines might not have examples (e.g. line 68: 蔬菜,3,3,)
        // In that case, the last part is empty or just a comma at the end?
        // Let's check line 68: "68: 蔬菜,3,3," -> ends with comma? Or is it empty 4th field?
        // Let's try to split by comma for the first 3 parts
    }

    const parts: string[] = [];
    let currentIndex = 0;

    // Field 1
    let nextComma = line.indexOf(',', currentIndex);
    if (nextComma === -1) return null;
    parts.push(line.substring(currentIndex, nextComma));
    currentIndex = nextComma + 1;

    // Field 2
    nextComma = line.indexOf(',', currentIndex);
    if (nextComma === -1) return null;
    parts.push(line.substring(currentIndex, nextComma));
    currentIndex = nextComma + 1;

    // Field 3
    nextComma = line.indexOf(',', currentIndex);
    if (nextComma === -1) {
        // If no 4th field/comma, that implies no content
        parts.push(line.substring(currentIndex));
        parts.push(""); // 4th field empty
    } else {
        parts.push(line.substring(currentIndex, nextComma));
        currentIndex = nextComma + 1;
        // Field 4: Rest of the line, potentially quoted
        parts.push(line.substring(currentIndex));
    }

    const word = parts[0].trim();
    if (!word || word === 'Word') return null; // Header or empty

    const revised = parseInt(parts[1].trim(), 10) || 0;
    const correct = parseInt(parts[2].trim(), 10) || 0;

    let contentRaw = parts[3].trim();
    let examples: Example[] = [];

    if (contentRaw && contentRaw.startsWith('"') && contentRaw.endsWith('"')) {
        // Unquote and unescape double quotes
        contentRaw = contentRaw.slice(1, -1).replace(/""/g, '"');
    }

    if (contentRaw) {
        try {
            const contentObj = JSON.parse(contentRaw);
            if (contentObj.examples && Array.isArray(contentObj.examples)) {
                // Filter and map examples
                examples = contentObj.examples.map((ex: any) => ({
                    chinese: ex.chinese || "",
                    english: ex.english || ""
                })).filter((ex: Example) => ex.chinese);
            }
        } catch (e) {
            console.warn(`Failed to parse content JSON for word ${word}:`, e);
        }
    }

    return {
        word,
        revised,
        correct,
        examples
    };
}

async function importFlashcards() {
    console.log(`Reading CSV from ${CSV_FILE_PATH}`);
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('CSV file not found!');
        return;
    }

    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    console.log(`Found ${lines.length} lines.`);

    const collectionRef = db.collection('users').doc(USER_ID).collection('profiles').doc(PROFILE_ID).collection('words');

    let count = 0;
    let errorCount = 0;

    for (const line of lines) {
        if (!line.trim()) continue;

        const parsed = parseCSVLine(line);
        if (!parsed) continue;

        try {
            // Check if word exists to avoid overwriting or duplicates if run multiple times
            // Using 'text' as unique key for simplicity here
            const existingQuery = await collectionRef.where('text', '==', parsed.word).limit(1).get();

            if (!existingQuery.empty) {
                console.log(`Skipping existing word: ${parsed.word}`);
                continue;
            }

            const docRef = collectionRef.doc();
            await docRef.set({
                id: docRef.id,
                text: parsed.word,
                revisedCount: parsed.revised,
                correctCount: parsed.correct,
                examples: parsed.examples,
                createdAt: new Date()
            });
            console.log(`Imported: ${parsed.word}`);
            count++;
        } catch (err) {
            console.error(`Error importing ${parsed.word}:`, err);
            errorCount++;
        }
    }

    console.log(`Import completed. imported: ${count}, Errors: ${errorCount}`);
}

importFlashcards().catch(console.error);
