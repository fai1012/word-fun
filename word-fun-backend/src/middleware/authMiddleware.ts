import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import { authService } from '../services/authService';
import { db } from '../services/firestoreService';


const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }

    try {
        const user = jwt.verify(token, JWT_SECRET) as any;
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);

        // DEBUG: Inspect token header
        const decoded = jwt.decode(token, { complete: true });
        console.log('Failed Token Header:', decoded?.header);

        // Explicitly return 401 for expiration to align with frontend refresh logic mostly,
        // but frontend also handles 403. Let's return 403 as "Forbidden/Invalid" is standard for bad token.
        // However, standard JWT exp error is verified.
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};


export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // 1. Check if user is authenticated (req.user populated by authenticateToken)
    if (!req.user || typeof req.user === 'string' || !req.user.sub) {
        res.status(401).json({ error: 'Unauthorized: User not identified' });
        return;
    }

    const userId = req.user.sub;

    try {
        // 2. Fetch User from Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            res.status(403).json({ error: 'Forbidden: User profile not found' });
            return;
        }

        const userData = userDoc.data();

        // 3. Check isAdmin
        if (userData?.isAdmin !== true) {
            res.status(403).json({ error: 'Forbidden: Admin access only' });
            return;
        }

        next();
    } catch (error) {
        console.error('Admin check failed:', error);
        res.status(500).json({ error: 'Internal server error during admin check' });
    }
};
