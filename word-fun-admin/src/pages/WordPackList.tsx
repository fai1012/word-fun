import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordPackService } from '../services/wordPackService';

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
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Word Pack Management</h2>
                <button
                    onClick={() => navigate('/word-packs/create')}
                    style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Create New Pack
                </button>
            </div>

            {loading ? (
                <p>Loading packs...</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Name</th>
                            <th style={{ padding: '12px' }}>Words Count</th>
                            <th style={{ padding: '12px' }}>Created</th>
                            <th style={{ padding: '12px' }}>Updated</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {packs.map(pack => (
                            <tr key={pack.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{pack.name}</td>
                                <td style={{ padding: '12px' }}>{pack.words?.length || 0}</td>
                                <td style={{ padding: '12px' }}>{pack.createdAt ? new Date(pack.createdAt).toLocaleDateString() : 'N/A'}</td>
                                <td style={{ padding: '12px' }}>{pack.updatedAt ? new Date(pack.updatedAt).toLocaleDateString() : 'N/A'}</td>
                                <td style={{ padding: '12px' }}>
                                    <button
                                        onClick={() => navigate(`/word-packs/edit/${pack.id}`)}
                                        style={{ padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default WordPackList;
