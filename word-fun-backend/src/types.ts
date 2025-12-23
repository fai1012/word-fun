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
    exp: number;
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
    tags?: string[];
    pronunciationUrl?: string; // Public URL of the audio file
    createdAt: Date;
    lastReviewedAt?: Date;
    masteredAt?: Date;
}

export interface WordPackWord {
    character: string;
    tags: string[];
    pronunciationUrl?: string;
    examples?: string[];
}

export interface WordPackData {
    name: string;
    words: WordPackWord[];
    isPublished?: boolean;
}

export interface WordPack extends WordPackData {
    id: string;
    isPublished?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Pronunciation {
    word: string; // The word identifier
    language: 'en' | 'zh';
    audioUrl: string; // Public URL of the audio file
    storagePath: string; // Internal path in the bucket
    createdAt: number; // Timestamp
}

export interface QueueItem {
    id?: string;
    wordId: string;
    wordText: string;
    userId: string;
    profileId: string;
    status: 'pending' | 'processing' | 'failed' | 'completed';
    createdAt: Date;
    startedAt?: Date;
    error?: string;
    attempts?: number;
}
