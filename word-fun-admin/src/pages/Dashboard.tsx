import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { Users, BookOpen, Activity } from 'lucide-react';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Total Users',
            value: stats?.totalUsers || 0,
            icon: Users,
            color: 'text-cyan-400',
            bg: 'bg-cyan-400/10'
        },
        {
            title: 'Total Profiles',
            value: stats?.totalProfiles || 0,
            icon: Activity,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10'
        },
        {
            title: 'Total Words',
            value: stats?.totalWords || 0,
            icon: BookOpen,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10'
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
                <p className="mt-1 text-sm text-gray-400">Welcome back to the admin control center.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((card) => (
                    <div
                        key={card.title}
                        className="relative overflow-hidden rounded-xl bg-slate-800 p-6 shadow-sm border border-slate-700 hover:border-slate-600 transition-all duration-200"
                    >
                        <dt>
                            <div className={`absolute rounded-lg p-3 ${card.bg}`}>
                                <card.icon className={`h-6 w-6 ${card.color}`} aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-slate-400">
                                {card.title}
                            </p>
                        </dt>
                        <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                            <p className="text-2xl font-semibold text-slate-100">
                                {card.value.toLocaleString()}
                            </p>
                        </dd>
                    </div>
                ))}
            </div>

            {/* Placeholder for future charts or lists */}
            <div className="rounded-xl bg-slate-800 shadow-sm border border-slate-700 p-6">
                <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/50">
                    <p className="text-slate-500 text-sm">Activity Chart Coming Soon</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
