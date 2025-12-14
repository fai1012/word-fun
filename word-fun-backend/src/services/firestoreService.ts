import { Firestore } from '@google-cloud/firestore';

const projectId = process.env.GCP_PROJECT_ID;
const keyFileContent = process.env.GCP_SERVICE_ACCOUNT_KEY;
const databaseId = process.env.FIRESTORE_DB_NAME || 'word-fun';

if (!projectId || !keyFileContent) {
    console.error('Firestore configuration missing: GCP_PROJECT_ID or GCP_SERVICE_ACCOUNT_KEY');
}

// Parse the JSON key if it's a string, or use it directly if handled otherwise (usually env var is string)
let credentials;
try {
    credentials = keyFileContent ? JSON.parse(keyFileContent) : undefined;
} catch (error) {
    console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY JSON', error);
}

export const db = new Firestore({
    projectId: projectId,
    credentials: credentials,
    databaseId: databaseId,
    ignoreUndefinedProperties: true,
});

console.log(`Firestore initialized for project ${projectId}, database ${databaseId}`);
