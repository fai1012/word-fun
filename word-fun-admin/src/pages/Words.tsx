import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, Volume2, Settings } from 'lucide-react';

interface Word {
    id: string;
    text: string;
    language: string;
    correctCount: number;
    revisedCount: number;
    userEmail?: string;
    profileName?: string;
    pronunciationUrl?: string; // Add optional url
    createdAt: string; // ISO String from backend
    lastReviewedAt?: string; // ISO String or null
    masteredAt?: string;
}

const Words: React.FC = () => {
    // State for Data
    const [words, setWords] = useState<Word[]>([]);
    const [totalWords, setTotalWords] = useState(0);

    // State for Filters/Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch words when params change
    useEffect(() => {
        const fetchWords = async () => {
            setLoading(true);
            try {
                const params: any = {
                    page,
                    limit: pageSize
                };
                if (debouncedSearch) {
                    params.search = debouncedSearch;
                }

                const response = await apiClient.get('/admin/words', { params });

                const responseData = response.data;
                if (responseData.data && typeof responseData.total === 'number') {
                    setWords(responseData.data);
                    setTotalWords(responseData.total);
                } else if (Array.isArray(responseData)) {
                    setWords(responseData);
                    setTotalWords(responseData.length);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load words');
            } finally {
                setLoading(false);
            }
        };

        fetchWords();
    }, [debouncedSearch, page, pageSize]);

    const [regenerating, setRegenerating] = useState(false);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState({
        word: true,
        userEmail: true,
        profileName: false,
        language: true,
        stats: true,
        successRate: true,
        createdAt: false,
        lastReviewedAt: false
    });

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    const handleRegenerate = async () => {
        if (!confirm('This will trigger background generation for ALL missing pronunciations which involves cost. Continue?')) {
            return;
        }
        setRegenerating(true);
        try {
            await apiClient.post('/admin/pronunciations/regenerate');
            alert("Regeneration triggered in background.");
        } catch (err) {
            console.error(err);
            alert('Failed to trigger regeneration');
        } finally {
            setRegenerating(false);
        }
    };

    // ... (fetchEffects) -> can stay as is

    const totalPages = Math.ceil(totalWords / pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Words Management</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        {totalWords} total words tracked across all users.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Loader2 className="w-4 h-4" />}
                        <span>Generate Missing Audio</span>
                    </button>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search user name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all w-full sm:w-64 shadow-sm placeholder-slate-500"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center bg-slate-800/50 p-2 px-4 rounded-xl border border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400 font-medium">Rows:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="text-sm bg-slate-900 border border-slate-700 text-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 outline-none p-1 transition-colors"
                        >
                            <option value={10}>10</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-slate-300 min-w-[100px] text-center">
                            Page {page} of {totalPages || 1}
                        </span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowColumnConfig(!showColumnConfig)}
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 border shadow-sm ${showColumnConfig
                                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-slate-600'
                            }`}
                        title="Configure Columns"
                    >
                        <Settings className={`w-4 h-4 ${showColumnConfig ? 'animate-spin-slow' : ''}`} />
                        <span className="text-sm font-medium">Columns</span>
                    </button>

                    {showColumnConfig && (
                        <div className="absolute right-0 top-full mt-3 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Visible Columns</div>
                            <div className="space-y-1">
                                {Object.entries(visibleColumns).map(([key, isVisible]) => (
                                    <label key={key} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-700/50 rounded-lg cursor-pointer group transition-colors">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isVisible}
                                                onChange={() => toggleColumn(key)}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                            />
                                        </div>
                                        <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin relative" />
                        </div>
                        <span className="text-slate-400 font-medium animate-pulse">Loading library...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="bg-red-500/20 p-2 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-red-400 font-bold">Error Loading Data</h3>
                        <p className="text-sm text-red-400/80">{error}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden ring-1 ring-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                                <tr>
                                    {visibleColumns.word && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Word</th>}
                                    {visibleColumns.userEmail && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">User Email</th>}
                                    {visibleColumns.profileName && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Profile</th>}
                                    {visibleColumns.language && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Language</th>}
                                    {visibleColumns.stats && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 text-center">Stats (C/R)</th>}
                                    {visibleColumns.successRate && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Success Rate</th>}
                                    {visibleColumns.createdAt && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Created At</th>}
                                    {visibleColumns.lastReviewedAt && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Last Reviewed</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {words.map(word => {
                                    const rate = word.revisedCount > 0
                                        ? Math.round((word.correctCount / word.revisedCount) * 100)
                                        : 0;
                                    return (
                                        <tr key={word.id} className="group hover:bg-slate-700/30 transition-all">
                                            {visibleColumns.word && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-100 text-lg group-hover:text-cyan-400 transition-colors">{word.text}</span>
                                                        {word.pronunciationUrl && (
                                                            <button
                                                                onClick={() => new Audio(word.pronunciationUrl).play()}
                                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/50 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all transform hover:scale-110 shadow-sm"
                                                                title="Play Pronunciation"
                                                            >
                                                                <Volume2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.userEmail && (
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-400 font-medium">{word.userEmail || '-'}</span>
                                                </td>
                                            )}
                                            {visibleColumns.profileName && (
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                        {word.profileName || 'Unknown'}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.language && (
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600 shadow-sm">
                                                        {word.language?.toUpperCase() || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.stats && (
                                                <td className="px-6 py-4 text-sm font-bold text-center">
                                                    <span className="text-emerald-400">{word.correctCount}</span>
                                                    <span className="mx-1.5 text-slate-600">/</span>
                                                    <span className="text-cyan-400">{word.revisedCount}</span>
                                                </td>
                                            )}
                                            {visibleColumns.successRate && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 w-20 h-2 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${rate >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                                    rate >= 50 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                                                    }`}
                                                                style={{ width: `${rate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 min-w-[30px]">{rate}%</span>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.createdAt && (
                                                <td className="px-6 py-4 text-sm text-slate-400 font-medium whitespace-nowrap">
                                                    {new Date(word.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                            )}
                                            {visibleColumns.lastReviewedAt && (
                                                <td className="px-6 py-4 text-sm text-slate-400 font-medium whitespace-nowrap">
                                                    {word.lastReviewedAt ? (
                                                        <div className="flex flex-col">
                                                            <span>{new Date(word.lastReviewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                            <span className="text-[10px] text-slate-500 opacity-80">{new Date(word.lastReviewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {words.length === 0 && (
                                    <tr>
                                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-500">
                                                <Search className="w-10 h-10 opacity-20" />
                                                <p className="font-medium">No words found matching your search.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Words;
