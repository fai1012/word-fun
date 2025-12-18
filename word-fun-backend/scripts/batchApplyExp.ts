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

async function batchApplyExp() {
    console.log('--- Starting EXP Batch Calculation ---');
    console.log(`Target Project: ${PROJECT_ID}`);
    console.log(`Target DB: ${DATABASE_ID}`);

    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users.`);

    let totalProfilesUpdated = 0;

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        console.log(`\nProcessing User: ${userData.email || userId}`);

        const profilesSnapshot = await userDoc.ref.collection('profiles').get();

        for (const profileDoc of profilesSnapshot.docs) {
            const profileId = profileDoc.id;
            const profileData = profileDoc.data();
            console.log(`  > Profile: ${profileData.displayName} (${profileId})`);

            const wordsSnapshot = await profileDoc.ref.collection('words').get();
            let calculatedExp = 0;
            let wordCount = 0;

            wordsSnapshot.forEach(wDoc => {
                const wData = wDoc.data();
                const revisedCount = wData.revisedCount || 0;
                const correctCount = wData.correctCount || 0;

                // EXP Rules Definition (Historical Proxy)
                // 1. Review Word: +5
                // 2. Got it (Proxy): +5
                // 3. Mastery: +10

                const reviewExp = revisedCount * 5;
                const gotItExp = correctCount * 5;
                const masteryExp = (correctCount >= 6) ? 10 : 0;

                calculatedExp += (reviewExp + gotItExp + masteryExp);
                wordCount++;
            });

            console.log(`    Words Processed: ${wordCount}`);
            console.log(`    Calculated EXP: ${calculatedExp}`);

            await profileDoc.ref.update({ exp: calculatedExp });
            console.log(`    Status: Updated Successfully`);
            totalProfilesUpdated++;
        }
    }

    console.log('\n--- EXP Batch Calculation Complete ---');
    console.log(`Total Profiles Updated: ${totalProfilesUpdated}`);
}

batchApplyExp().catch(e => {
    console.error('Fatal Migration Error:', e);
    process.exit(1);
});
