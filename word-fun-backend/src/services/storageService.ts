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

    getUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path; // Already a full URL

        // Encode each path segment for URL (handles Chinese characters)
        // Split by '/', encode each segment, rejoin
        const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/');

        const cdnHost = process.env.CDN_HOST;
        if (cdnHost) {
            // Remove trailing slash if present
            const host = cdnHost.endsWith('/') ? cdnHost.slice(0, -1) : cdnHost;
            // Remove leading slash from path if present
            const cleanPath = encodedPath.startsWith('/') ? encodedPath.slice(1) : encodedPath;
            return `${host}/${cleanPath}`;
        }

        // Fallback to direct storage URL if no CDN (though this will be 403 for private buckets without auth)
        return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
    }
};
