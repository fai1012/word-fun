import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// GCP Credentials should be automatically picked up from GOOGLE_APPLICATION_CREDENTIALS
// or if running in environment with default credentials.
// For this project, we might need to manually pass credentials if they are in an env var string.
// However, the standard way is to use existing auth.
// Let's check how firestoreService does it. It parses GCP_SERVICE_ACCOUNT_KEY.
// We should do the same here.

const keyFileContent = process.env.GCP_SERVICE_ACCOUNT_KEY;
let credentials;
try {
    credentials = keyFileContent ? JSON.parse(keyFileContent) : undefined;
} catch (error) {
    console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY JSON for TTS', error);
}

const client = new TextToSpeechClient({
    credentials
});

export const ttsService = {
    async generatePronunciation(text: string, languageCode: 'en-US' | 'zh-HK' = 'en-US', gender: 'MALE' | 'FEMALE' | 'NEUTRAL' = 'NEUTRAL'): Promise<Buffer> {
        const request = {
            input: { text },
            // Select the language and SSML voice gender (optional)
            voice: { languageCode, ssmlGender: gender },
            // select the type of audio encoding
            audioConfig: { audioEncoding: 'MP3' as const },
        };

        // Performs the text-to-speech request
        const [response] = await client.synthesizeSpeech(request);

        if (!response.audioContent) {
            throw new Error('No audio content returned from TTS service');
        }

        // The audioContent is a binary buffer of the contents of the file
        return Buffer.from(response.audioContent);
    }
};
