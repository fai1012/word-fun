import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface Word {
    id: string;
    text: string;
    language: string;
    correctCount: number;
    revisedCount: number;
    userEmail?: string;
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

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                        <span className="text-slate-400">Loading library...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-md flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            ) : (
                <>
                    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/50 border-b border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Word</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User Email</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Language</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Stats (Correct/Revised)</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {words.map(word => {
                                        const rate = word.revisedCount > 0
                                            ? Math.round((word.correctCount / word.revisedCount) * 100)
                                            : 0;
                                        return (
                                            <tr key={word.id} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-200 text-lg">{word.text}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    {word.userEmail || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
                                                        {word.language?.toUpperCase() || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    <span className="text-emerald-400 font-medium">{word.correctCount}</span>
                                                    <span className="mx-1 text-slate-600">/</span>
                                                    <span className="text-cyan-400 font-medium">{word.revisedCount}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' :
                                                                    rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                style={{ width: `${rate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-400">{rate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {words.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No words found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-800 px-4 py-3 border border-slate-700 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="text-sm bg-slate-900 border-slate-700 text-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 outline-none p-1"
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
                                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-slate-300 min-w-[80px] text-center">
                                Page {page} of {totalPages || 1}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Words;
