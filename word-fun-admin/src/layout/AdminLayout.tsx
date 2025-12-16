import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AdminLayout: React.FC = () => {
    return (
        <div className="admin-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Word Fun Admin</h2>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li><Link to="/">Dashboard</Link></li>
                        <li><Link to="/users">Users</Link></li>
                        <li><Link to="/words">Words</Link></li>
                    </ul>
                </nav>
            </aside>
            <main className="main-content">
                <header className="top-bar">
                    <h1>Administration</h1>
                </header>
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
