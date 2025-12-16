import { Request, Response } from 'express';
import { adminService } from '../services/adminService';

class AdminController {
    async getSystemStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = await adminService.getSystemStats();
            res.status(200).json(stats);
        } catch (error) {
            console.error('Error fetching system stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const users = await adminService.getAllUsers();
            res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAllWords(req: Request, res: Response): Promise<void> {
        try {
            const words = await adminService.getAllWords();
            res.status(200).json(words);
        } catch (error) {
            console.error('Error fetching words:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const adminController = new AdminController();
