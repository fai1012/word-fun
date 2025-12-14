import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { authenticateToken } from './middleware/authMiddleware';
import { AuthenticatedRequest } from './types';

const app: Express = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public Routes
app.get('/', (req: Request, res: Response) => {
    res.send('Word Fun Backend is running!');
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

import profileRoutes from './routes/profileRoutes';

// Mount User/Profile Routes
// While the file is 'userRoutes', we mount it at '/api/profiles' to match the new semantics
// or we can keep it at '/api/users' but the user specifically asked to update the endpoint URL.
// The user request said "Update the endpoint url". 
// I will mount it at /api/profiles as discussed in plan.
app.use('/api/profiles', profileRoutes);


// Protected Routes (example)
app.get('/api/protected', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({
        message: 'This is a protected route',
        user: req.user
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
