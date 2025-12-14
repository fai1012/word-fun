import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import { authService } from '../services/authService';

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }

    try {
        const publicKey = await authService.getPublicKey();
        const user = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);

        // DEBUG: Inspect token header
        const decoded = jwt.decode(token, { complete: true });
        console.log('Failed Token Header:', decoded?.header);
        console.log('Using Public Key (first 50 chars):', (await authService.getPublicKey()).substring(0, 50));

        res.status(403).json({ error: 'Invalid or expired token' });
    }
};
