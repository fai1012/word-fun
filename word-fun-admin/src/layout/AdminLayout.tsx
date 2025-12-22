import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();

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
                        <li><Link to="/word-packs">Word Packs</Link></li>
                    </ul>
                </nav>
            </aside>
            <main className="main-content">
                <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>Administration</h1>
                    <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {user.picture && <img src={user.picture} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%' }} referrerPolicy="no-referrer" />}
                                <span>{user.name}</span>
                            </div>
                        )}
                        <button onClick={logout} style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Sign Out
                        </button>
                    </div>
                </header>
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
