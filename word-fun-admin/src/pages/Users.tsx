import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

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

    if (loading) return <div>Loading users...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="page users">
            <h2>Users Management</h2>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Created At</th>
                            <th>Last Login</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td>{new Date(user.lastLoginAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Users;
