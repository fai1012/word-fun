import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Extend Express Request to include user data
export interface AuthenticatedRequest extends Request {
    user?: string | JwtPayload;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The user ID from auth-service
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         photoURL:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 */
export interface User {
    id: string; // The user ID from auth-service (uid)
    email?: string;
    name?: string;
    photoURL?: string;
    createdAt: Date;
    lastLoginAt: Date;
    isAdmin: boolean;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Profile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         displayName:
 *           type: string
 *         avatarId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */
export interface Profile {
    id: string;
    userId: string;
    displayName: string;
    avatarId: string; // ID or URL of the avatar
    createdAt: Date;
    stats?: Record<string, any>;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Word:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         text:
 *           type: string
 *         revisedCount:
 *           type: integer
 *         correctCount:
 *           type: integer
 *         examples:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */
export interface Word {
    id: string;
    text: string; // The word itself
    language: 'zh' | 'en';
    revisedCount: number;
    correctCount: number;
    examples: (string | { chinese: string; english: string })[];
    createdAt: Date;
    lastReviewedAt?: Date;
    masteredAt?: Date;
}
