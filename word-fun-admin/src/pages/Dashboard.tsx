import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

interface SystemStats {
    totalUsers: number;
    totalProfiles: number;
    totalWords: number;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await apiClient.get('/admin/stats');
                setStats(response.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="page dashboard">
            <h2>Dashboard</h2>
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <p>{stats?.totalUsers || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Profiles</h3>
                    <p>{stats?.totalProfiles || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Words</h3>
                    <p>{stats?.totalWords || 0}</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
