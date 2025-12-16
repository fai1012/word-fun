import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

interface Word {
    id: string;
    text: string;
    language: string;
    correctCount: number;
    revisedCount: number;
}

const Words: React.FC = () => {
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWords = async () => {
            try {
                const response = await apiClient.get('/admin/words');
                setWords(response.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load words');
            } finally {
                setLoading(false);
            }
        };

        fetchWords();
    }, []);

    if (loading) return <div>Loading words...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="page words">
            <h2>Words Management</h2>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Word</th>
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
        </div>
    );
};

export default Words;
