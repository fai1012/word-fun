import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { userService } from '../services/userService';
import { JwtPayload } from 'jsonwebtoken';
import { profileService } from '../services/profileService';

class ProfileController {
    async syncUser(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload; // Authenticated middleware ensures this exists

            // Assuming the JWT structure has 'sub' as userId and optionally 'email'/'name'
            // Adjust based on your actual auth-service JWT payload
            const userId = user.id || user.sub;

            if (!userId) {
                res.status(400).json({ error: 'Invalid token: missing user ID' });
                return;
            }

            const { email, name, picture } = user;

            // 1. Ensure User Account Exists (and update metadata)
            const syncedUser = await userService.syncUser(userId, email, name);

            // 2. Fetch Profiles for this User
            const profiles = await profileService.getProfiles(userId);

            // 3. Return combined result
            res.status(200).json({
                user: syncedUser,
                profiles: profiles
            });
        } catch (error) {
            console.error('Error syncing user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Create a new profile for the authenticated user.
     */
    async createProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;

            const { displayName, avatarId } = req.body;

            if (!displayName || !avatarId) {
                res.status(400).json({ error: 'Missing required fields: displayName, avatarId' });
                return;
            }

            const newProfile = await profileService.createProfile(userId, displayName, avatarId);
            res.status(201).json(newProfile);
        } catch (error) {
            console.error('Error creating profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { profileId } = req.params;
            const { displayName, avatarId, exp } = req.body;

            const updates: { displayName?: string; avatarId?: string; exp?: number } = {};
            if (displayName) updates.displayName = displayName;
            if (avatarId) updates.avatarId = avatarId;
            if (typeof exp === 'number') updates.exp = exp;

            if (Object.keys(updates).length > 0) {
                await profileService.updateProfile(userId, profileId, updates);
            }

            res.status(200).json({ id: profileId, ...updates });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user as JwtPayload;
            const userId = user.id || user.sub;
            const { profileId } = req.params;

            await profileService.deleteProfile(userId, profileId);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const profileController = new ProfileController();
