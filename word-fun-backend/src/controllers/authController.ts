
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { db } from '../services/firestoreService';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
}

const client = new OAuth2Client(CLIENT_ID);

const generateTokens = (user: any) => {
    const accessToken = jwt.sign(
        { sub: user.id, email: user.email, name: user.name, picture: user.picture },
        JWT_SECRET,
        { expiresIn: '1h' } // Access token usually short lived
    );

    const refreshToken = jwt.sign(
        { sub: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' } // Refresh token longer lived
    );

    return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;

        if (!token) {
            res.status(400).json({ error: 'Token is required' });
            return;
        }

        // 1. Verify Google Token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload) {
            res.status(401).json({ error: 'Invalid token payload' });
            return;
        }

        const { sub: googleId, email, name, picture } = payload;
        const userId = googleId; // Use Google ID as User ID for simplicity

        // 2. Create/Update User in Firestore
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            await userRef.set({
                id: userId,
                email,
                name,
                picture,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } else {
            // Optional: Update profile info on login
            await userRef.update({
                name,
                picture,
                updatedAt: new Date()
            });
        }

        // 3. Generate Tokens
        const tokens = generateTokens({ id: userId, email, name, picture });

        res.json({
            token: tokens.accessToken,
            refresh_token: tokens.refreshToken, // Snake case to match frontend expectation
            user: { id: userId, email, name, picture }
        });

    } catch (error) {
        console.error('Login failed:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        res.status(400).json({ error: 'Refresh Token required' });
        return;
    }

    try {
        // DEBUG LOGGING
        try {
            const decodedDebug = jwt.decode(refreshToken) as any;
            const maskedToken = `${refreshToken.substring(0, 10)}...${refreshToken.substring(refreshToken.length - 5)}`;
            const expTime = decodedDebug?.exp ? new Date(decodedDebug.exp * 1000).toLocaleString() : 'Unknown';
            console.log(`[AuthRefresh] Verifying Refresh Token: ${maskedToken} | Expires: ${expTime}`);
        } catch (e) {
            console.log('[AuthRefresh] Error decoding token for debug log');
        }

        // 1. Verify Refresh Token
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

        if (decoded.type !== 'refresh') {
            res.status(403).json({ error: 'Invalid token type' });
            return;
        }

        const userId = decoded.sub;

        // 2. Check if user still exists/is active (Optional but recommended)
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            res.status(403).json({ error: 'User not found' });
            return;
        }
        const user = userDoc.data();

        // 3. Issue new Access Token and Rotate Refresh Token
        const tokens = generateTokens({ id: userId, email: user?.email, name: user?.name, picture: user?.picture });

        res.json({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken // Rotation
        });

    } catch (error) {
        console.error('Token refresh failed:', error);
        res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
};
