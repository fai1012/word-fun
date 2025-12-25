import React, { useEffect, useState } from 'react';
import { queueService } from '../services/queueService';
import type { QueueItem } from '../services/queueService';
import { RefreshCcw, Play, Loader2, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';

const Queue: React.FC = () => {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchQueue = async () => {
        try {
            const data = await queueService.getAll();
            setItems(data);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to load queue items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, []);

    const handleTrigger = async () => {
        setActionLoading(true);
        try {
            await queueService.trigger();
            await fetchQueue();
        } catch (err) {
            alert('Failed to trigger queue');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRetryAll = async () => {
        setActionLoading(true);
        try {
            const result = await queueService.retryAll();
            alert(`Queued ${result.count} items for retry.`);
            await fetchQueue();
        } catch (err) {
            alert('Failed to retry items');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'processing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
            case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-4 h-4" />;
            case 'processing': return <Loader2 className="w-4 h-4 animate-spin" />;
            case 'failed': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Example Generation Queue</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Monitor and manage background AI example generation tasks.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRetryAll}
                        disabled={actionLoading || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                        <span>Retry Failed</span>
                    </button>
                    <button
                        onClick={handleTrigger}
                        disabled={actionLoading || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-50 font-medium"
                    >
                        <Play className="w-4 h-4" />
                        <span>Trigger Process</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl flex items-center gap-4">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                        <h3 className="text-red-400 font-bold">Error</h3>
                        <p className="text-sm text-red-400/80">{error}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Word</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 text-center">Attempts</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700">Last Error</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700 text-right">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {items.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-100">{item.wordText}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{item.wordId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(item.status)}`}>
                                                    {getStatusIcon(item.status)}
                                                    <span className="capitalize">{item.status}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-sm font-bold ${item.attempts > 1 ? 'text-yellow-500' : 'text-slate-400'}`}>
                                                {item.attempts} / 3
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs truncate text-xs text-red-400/80 font-medium" title={item.error}>
                                                {item.error || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm text-slate-300 font-medium">
                                                    {item.createdAt ? new Date(item.createdAt._seconds * 1000).toLocaleDateString() : '-'}
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    {item.createdAt ? new Date(item.createdAt._seconds * 1000).toLocaleTimeString() : '-'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                            No items in the generation queue.
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

export default Queue;
