import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { Mail, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    lastLoginAt: string;
    createdAt: string;
}

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await apiClient.get('/admin/users');
                setUsers(response.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                    <span className="text-slate-400">Loading users...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-md flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Users Management</h1>
                <p className="mt-1 text-sm text-slate-400">View and track all registered users.</p>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-xs uppercase">
                                                {user.name?.[0] || 'U'}
                                            </div>
                                            <div className="font-medium text-slate-200">{user.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Mail className="w-4 h-4 opacity-50" />
                                            <span className="text-sm">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar className="w-4 h-4 opacity-50" />
                                            <span className="text-sm">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Clock className="w-4 h-4 opacity-50" />
                                            <span className="text-sm">
                                                {new Date(user.lastLoginAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Users;
