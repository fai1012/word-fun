import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordPackService } from '../services/wordPackService';
import { Plus, Edit, Package, Calendar, FileText } from 'lucide-react';

const WordPackList: React.FC = () => {
    const navigate = useNavigate();
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPacks = async () => {
            try {
                const data = await wordPackService.getAllPacks();
                setPacks(data);
            } catch (error) {
                console.error("Failed to fetch packs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPacks();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Word Packs</h1>
                    <p className="mt-1 text-sm text-slate-400">Manage your vocabulary collections and categories.</p>
                </div>
                <button
                    onClick={() => navigate('/word-packs/create')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 font-semibold text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create New Pack
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px] bg-slate-800 rounded-xl border border-slate-700 shadow-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                        <p className="text-slate-400 font-medium">Loading collections...</p>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 border-b border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Content</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Updated</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {packs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            No word packs found. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    packs.map(pack => (
                                        <tr key={pack.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                    <span className="font-medium text-slate-200">{pack.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${pack.isPublished
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-slate-700/50 text-slate-400 border-slate-600'
                                                    }`}>
                                                    {pack.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <FileText className="w-4 h-4 opacity-50" />
                                                    <span className="text-sm">{pack.words?.length || 0} words</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Calendar className="w-4 h-4 opacity-50" />
                                                    <span className="text-sm">
                                                        {pack.createdAt ? new Date(pack.createdAt).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {pack.updatedAt ? new Date(pack.updatedAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/word-packs/edit/${pack.id}`)}
                                                    className="inline-flex items-center justify-center p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                                                    title="Edit Pack"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordPackList;
