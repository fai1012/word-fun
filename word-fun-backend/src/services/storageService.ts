import { Storage } from '@google-cloud/storage';
import path from 'path';

const keyFileContent = process.env.GCP_SERVICE_ACCOUNT_KEY;
const projectId = process.env.GCP_PROJECT_ID;
const bucketName = process.env.GCP_STORAGE_BUCKET_NAME || 'word-fun';

let credentials;
try {
    credentials = keyFileContent ? JSON.parse(keyFileContent) : undefined;
} catch (error) {
    console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY JSON for Storage', error);
}

const storage = new Storage({
    projectId,
    credentials
});

const bucket = storage.bucket(bucketName);

export const storageService = {
    async uploadFile(buffer: Buffer, destination: string): Promise<string> {
        const file = bucket.file(destination);

        await file.save(buffer, {
            contentType: 'audio/mpeg',
            // public: true, // Removed for UBLA support
        });

        // Return the relative path (destination) to be stored in DB
        return destination;
    },

    getUrl(pathOrUrl: string): string {
        if (!pathOrUrl) return '';

        // If it's already our backend serving URL (starts with /api), return as is
        if (pathOrUrl.startsWith('/api/pronunciations/serve')) {
            return pathOrUrl;
        }

        // Otherwise, treat it as a relative path and wrap it
        return `/api/pronunciations/serve?path=${encodeURIComponent(pathOrUrl)}`;
    },

    async getFileStream(path: string): Promise<NodeJS.ReadableStream> {
        const file = bucket.file(path);
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File not found: ${path}`);
        }
        return file.createReadStream();
    }
};


