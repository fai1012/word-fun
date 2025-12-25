import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, BookOpen, Layers, LogOut, Menu, X, Activity } from 'lucide-react';

const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Words Management', href: '/words', icon: BookOpen },
        { name: 'Word Packs', href: '/word-packs', icon: Layers },
        { name: 'Generation Queue', href: '/queue', icon: Activity },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-slate-200 flex font-sans">
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                    lg:relative lg:translate-x-0
                `}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Nexus Admin
                    </span>
                    <button
                        className="ml-auto lg:hidden text-slate-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => `
                                w-full flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 group
                                ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                    <span className="font-medium">{item.name}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile / Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        {user?.picture ? (
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="w-9 h-9 rounded-full border border-slate-700"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                {user?.name?.[0]}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">Administrator</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-400/5 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/10"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header */}
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 lg:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="text-slate-400 hover:text-white p-2 -ml-2"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-semibold text-slate-100">Word Fun Admin</span>
                </header>

                <div className="flex-1 overflow-auto p-4 sm:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
