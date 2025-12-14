import { db } from '../src/services/firestoreService';

async function verifyFirestore() {
    console.log('Testing Firestore connection...');
    try {
        const testDocRef = db.collection('test_verification').doc('ping');
        await testDocRef.set({
            timestamp: new Date().toISOString(),
            message: 'Hello from verification script'
        });
        console.log('Successfully wrote to Firestore.');

        const doc = await testDocRef.get();
        if (doc.exists) {
            console.log('Successfully read from Firestore:', doc.data());
        } else {
            console.error('Document not found after write.');
        }

        console.log('verification: SUCCESS');
    } catch (error) {
        console.error('Firestore connection failed:', error);
        console.log('verification: FAILED');
        process.exit(1);
    }
}

verifyFirestore();
