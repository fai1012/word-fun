import { authService } from '../src/services/authService';

async function verifyPublicKey() {
    console.log('Testing public key fetch...');
    try {
        const publicKey = await authService.getPublicKey();
        console.log('Successfully fetched public key:');
        console.log(publicKey.substring(0, 50) + '...');
        console.log('verification: SUCCESS');
    } catch (error) {
        console.error('Failed to fetch public key:', error);
        console.log('verification: FAILED');
        process.exit(1);
    }
}

verifyPublicKey();
