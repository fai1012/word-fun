import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { wordPackService, type WordPackWord } from '../services/wordPackService';
import TagAutocomplete from '../components/TagAutocomplete';

const CreateWordPack: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    // Core state
    const [name, setName] = useState('');
    const [words, setWords] = useState<WordPackWord[]>([]);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

    // Input state
    const [wordInput, setWordInput] = useState('');
    const [selectedTagsForNewWord, setSelectedTagsForNewWord] = useState<string[]>([]);

    useEffect(() => {
        if (isEditing) {
            const fetchPack = async () => {
                try {
                    const pack = await wordPackService.getPackById(id!);
                    if (pack) {
                        setName(pack.name);
                        setWords(pack.words || []);
                    }
                } catch (error) {
                    console.error("Failed to fetch pack", error);
                    alert("Failed to load pack data.");
                } finally {
                    setLoading(false);
                }
            };
            fetchPack();
        }
    }, [id, isEditing]);

    const persistChanges = async (updatedWords: WordPackWord[]) => {
        if (!isEditing || !id) return;

        setSaving(true);
        try {
            await wordPackService.updatePack(id, {
                name,
                words: updatedWords
            });
        } catch (error) {
            console.error('Failed to auto-save:', error);
            // We don't want to alert on every auto-save failure, but maybe show a status
        } finally {
            setSaving(false);
        }
    };

    const handleAddWord = () => {
        if (!wordInput.trim()) return;

        const tags = selectedTagsForNewWord;
        const hasChinese = (s: string) => /[\u4e00-\u9fa5]/.test(s);
        const hasEnglish = (s: string) => /[a-zA-Z]/.test(s);

        if (hasChinese(wordInput) && hasEnglish(wordInput)) {
            alert("Cannot mix English and Chinese in the same word.");
            return;
        }

        const newWord: WordPackWord = {
            character: wordInput,
            tags
        };

        const updatedWords = [...words, newWord];
        setWords(updatedWords);
        setWordInput('');
        setSelectedTagsForNewWord([]);
        persistChanges(updatedWords);
    };

    const handleRemoveWord = (index: number) => {
        const updatedWords = words.filter((_, i) => i !== index);
        setWords(updatedWords);
        persistChanges(updatedWords);
    };

    const handleWordUpdate = (index: number, field: keyof WordPackWord, value: any) => {
        const newWords = [...words];
        newWords[index] = { ...newWords[index], [field]: value };
        setWords(newWords);
        persistChanges(newWords);
    };

    const handleGenerateExamples = async (index: number) => {
        const word = words[index].character;
        if (!word) return;

        setGeneratingIndex(index);
        try {
            const examples = await wordPackService.generateExamples(word);
            const newWords = [...words];
            newWords[index] = { ...newWords[index], examples };
            setWords(newWords);
            persistChanges(newWords);
        } catch (error) {
            console.error('Failed to generate examples:', error);
            alert('Failed to generate examples. Please try again.');
        } finally {
            setGeneratingIndex(null);
        }
    };

    const handleExampleUpdate = (wordIndex: number, exampleIndex: number, value: string) => {
        const word = words[wordIndex];
        const newExamples = [...(word.examples || [])];
        newExamples[exampleIndex] = value;
        const newWords = [...words];
        newWords[wordIndex] = { ...newWords[wordIndex], examples: newExamples };
        setWords(newWords);
        persistChanges(newWords);
    };

    const handleSave = async () => {
        if (!name) {
            alert("Please provide a pack name");
            return;
        }
        if (words.length === 0) {
            alert("Please add at least one word");
            return;
        }

        setSaving(true);
        try {
            // This function is now primarily for creating new packs
            // For editing, changes are auto-saved via persistChanges
            if (!isEditing) {
                await wordPackService.createPack({ name, words });
                alert("Word Pack created successfully!");
                navigate('/word-packs');
            }
        } catch (error) {
            console.error("Failed to save pack", error);
            alert("Failed to save word pack.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <button
                onClick={() => navigate('/word-packs')}
                style={{ marginBottom: '10px', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0 }}
            >
                &larr; Back to List
            </button>
            <h2>{isEditing ? 'Edit' : 'Create'} Word Pack</h2>

            {loading ? (
                <p>Loading pack data...</p>
            ) : (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>Pack Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. HSK Level 1"
                            style={{ padding: '8px', width: '300px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 1, padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <h3>Add Word</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input
                                    value={wordInput}
                                    onChange={e => setWordInput(e.target.value)}
                                    placeholder="Word (Chinese or English)"
                                    style={{ padding: '8px' }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddWord();
                                    }}
                                />
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Tags</label>
                                    <TagAutocomplete
                                        selectedTags={selectedTagsForNewWord}
                                        onChange={setSelectedTagsForNewWord}
                                        placeholder="Add tags to word..."
                                    />
                                </div>
                                <button
                                    onClick={handleAddWord}
                                    style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Add Word
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 2 }}>
                            <h3>Words List ({words.length})</h3>
                            <div style={{ maxHeight: '700px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
                                {words.map((w, i) => {
                                    const isWordEditing = editingIndex === i;

                                    if (!isWordEditing) {
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setEditingIndex(i)}
                                                style={{
                                                    padding: '12px 15px',
                                                    borderBottom: '1px solid #eee',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '16px', minWidth: '100px' }}>{w.character}</span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                        {w.tags.map(tag => (
                                                            <span key={tag} style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: '#666' }}>
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#007bff' }}>Click to edit &rarr;</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={i} style={{ padding: '20px', borderBottom: '2px solid #007bff', background: '#f0f7ff', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h4 style={{ margin: 0, color: '#007bff' }}>Editing Word</h4>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveWord(i); setEditingIndex(null); }}
                                                        style={{ color: 'red', cursor: 'pointer', border: '1px solid red', padding: '4px 12px', borderRadius: '4px', background: 'white', fontSize: '12px' }}
                                                    >
                                                        Delete Word
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingIndex(null); }}
                                                        disabled={saving}
                                                        style={{ background: '#007bff', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold', opacity: saving ? 0.7 : 1 }}
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Word (Chinese or English)</label>
                                                <input
                                                    value={w.character}
                                                    onChange={e => handleWordUpdate(i, 'character', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                                />
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Tags</label>
                                                <TagAutocomplete
                                                    selectedTags={w.tags}
                                                    onChange={(newTags) => handleWordUpdate(i, 'tags', newTags)}
                                                />
                                            </div>

                                            <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Examples</span>
                                                    <button
                                                        onClick={() => handleGenerateExamples(i)}
                                                        disabled={generatingIndex === i}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: generatingIndex === i ? '#6c757d' : '#17a2b8',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: generatingIndex === i ? 'not-allowed' : 'pointer',
                                                            fontSize: '12px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px'
                                                        }}
                                                    >
                                                        {generatingIndex === i ? (
                                                            <>
                                                                <span className="spinner-small" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                                                Generating...
                                                            </>
                                                        ) : 'Generate Examples'}
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {[0, 1, 2].map(exIdx => (
                                                        <textarea
                                                            key={exIdx}
                                                            value={(w.examples || [])[exIdx] || ''}
                                                            onChange={e => handleExampleUpdate(i, exIdx, e.target.value)}
                                                            placeholder={`Example ${exIdx + 1}`}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                fontSize: '13px',
                                                                minHeight: '45px',
                                                                borderRadius: '4px',
                                                                border: '1px solid #ced4da',
                                                                resize: 'vertical'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {words.length === 0 && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                                        No words added yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '20px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
                        {saving && <span style={{ color: '#17a2b8', fontWeight: 'bold', fontSize: '14px' }}>Saving changes...</span>}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: '12px 30px',
                                background: isEditing ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                display: isEditing ? 'none' : 'block'
                            }}
                        >
                            {isEditing ? 'Pack Updated (Auto-saved)' : (saving ? 'Creating...' : 'Create Word Pack')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CreateWordPack;
