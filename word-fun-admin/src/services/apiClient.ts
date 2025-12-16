import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor if we need to attach tokens later (for now, admin might not need auth or we'll assume local/public for MVP as per "viewing data" request without auth specs)
// However, the backend middleware checks for `authenticateToken`.
// I will add a placeholder or simple auth if the user has a token mechanism.
// Since this is "Administration panel", usually it requires high privs.
// But the prompt says "viewing data in the databases e.g. the user registered...".
// The existing backend `profileRoutes` uses `authenticateToken`.
// I'll need to see how `word-fun-frontend` handles auth. It probably uses Firebase Auth or Google Sign In.
// For now, I'll create the basic client.

export default apiClient;
