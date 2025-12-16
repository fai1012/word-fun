import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

interface Word {
    id: string;
    text: string;
    language: string;
    correctCount: number;
    revisedCount: number;
    userEmail?: string; // Added userEmail
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

                // Handle new response format { data, total }
                // Fallback for safety if backend isn't 100% synced yet
                const responseData = response.data;
                if (responseData.data && typeof responseData.total === 'number') {
                    setWords(responseData.data);
                    setTotalWords(responseData.total);
                } else if (Array.isArray(responseData)) {
                    // Legacy fallback
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
        <div className="page words">
            <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Words Management ({totalWords})</h2>
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search user name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
                    />
                </div>
            </div>

            {loading ? <div>Loading words...</div> : error ? <div className="error">{error}</div> : (
                <>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Word</th>
                                    <th>User Email</th>
                                    <th>Language</th>
                                    <th>Correct</th>
                                    <th>Revised</th>
                                    <th>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {words.map(word => {
                                    const rate = word.revisedCount > 0
                                        ? Math.round((word.correctCount / word.revisedCount) * 100)
                                        : 0;
                                    return (
                                        <tr key={word.id}>
                                            <td><strong>{word.text}</strong></td>
                                            <td>{word.userEmail || '-'}</td>
                                            <td>{word.language?.toUpperCase() || 'N/A'}</td>
                                            <td>{word.correctCount}</td>
                                            <td>{word.revisedCount}</td>
                                            <td>{rate}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                style={{ padding: '5px', borderRadius: '4px' }}
                            >
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', cursor: page <= 1 ? 'not-allowed' : 'pointer', background: page <= 1 ? '#eee' : '#fff' }}
                            >
                                Previous
                            </button>
                            <span>Page {page} of {totalPages || 1}</span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', cursor: page >= totalPages ? 'not-allowed' : 'pointer', background: page >= totalPages ? '#eee' : '#fff' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Words;
