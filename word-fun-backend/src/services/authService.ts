const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8080';

class AuthService {
    private publicKey: string | null = null;

    /**
     * Fetches public key from external auth-service.
     */
    async getPublicKey(): Promise<string> {
        if (this.publicKey) {
            return this.publicKey;
        }

        try {
            const url = `${AUTH_SERVICE_URL}/public-key`;
            console.log(`Fetching public key from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch public key: ${response.statusText}`);
            }
            this.publicKey = await response.text();
            return this.publicKey;
        } catch (error) {
            console.error('Error fetching public key:', error);
            throw new Error('Failed to fetch public key from auth-service');
        }
    }
}

export const authService = new AuthService();
