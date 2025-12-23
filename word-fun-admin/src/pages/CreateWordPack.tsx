import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { wordPackService, type WordPackWord } from '../services/wordPackService';
import TagAutocomplete from '../components/TagAutocomplete';
import { ArrowLeft, Save, Plus, Trash2, Check, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

const CreateWordPack: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    // Core state
    const [name, setName] = useState('');
    const [words, setWords] = useState<WordPackWord[]>([]);
    const [isPublished, setIsPublished] = useState(false);
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
                        setIsPublished(pack.isPublished ?? false);
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

    const handleTogglePublished = async () => {
        const newVal = !isPublished;
        setIsPublished(newVal);
        if (isEditing && id) {
            setSaving(true);
            try {
                await wordPackService.updatePack(id, {
                    name,
                    words,
                    isPublished: newVal
                });
            } catch (error) {
                console.error("Failed to toggle publish status", error);
            } finally {
                setSaving(false);
            }
        }
    };

    const persistChanges = async (updatedWords: WordPackWord[]) => {
        if (!isEditing || !id) return;

        setSaving(true);
        try {
            await wordPackService.updatePack(id, {
                name,
                words: updatedWords,
                isPublished
            });
        } catch (error) {
            console.error('Failed to auto-save:', error);
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
            if (!isEditing) {
                await wordPackService.createPack({ name, words, isPublished });
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
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/word-packs')}
                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{isEditing ? 'Edit Word Pack' : 'Create New Pack'}</h1>
                        <p className="text-sm text-slate-400">
                            {isEditing ? 'Changes are saved automatically as you edit.' : 'Add initial words to create the pack.'}
                        </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl hover:bg-slate-700/50 transition-colors">
                        <span className={`text-sm font-medium transition-colors ${isPublished ? 'text-cyan-400' : 'text-slate-400'}`}>
                            {isPublished ? 'Published' : 'Draft'}
                        </span>
                        <div className={`relative w-10 h-6 rounded-full transition-colors ${isPublished ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input
                            type="checkbox"
                            checked={isPublished}
                            onChange={handleTogglePublished}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px] bg-slate-800 rounded-2xl border border-slate-700 shadow-sm">
                    <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Pack Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. HSK Level 1 Vocabulary"
                            className="w-full max-w-md px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-colors placeholder-slate-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Panel: Add Word */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm sticky top-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Add New Word</h3>
                                <div className="space-y-4">
                                    <input
                                        value={wordInput}
                                        onChange={e => setWordInput(e.target.value)}
                                        placeholder="Enter character/word..."
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-colors placeholder-slate-500"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddWord();
                                        }}
                                    />

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tags</label>
                                        <TagAutocomplete
                                            selectedTags={selectedTagsForNewWord}
                                            onChange={setSelectedTagsForNewWord}
                                            placeholder="Add tags..."
                                        />
                                    </div>

                                    <button
                                        onClick={handleAddWord}
                                        disabled={!wordInput.trim()}
                                        className="w-full py-3 px-4 bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl hover:bg-cyan-400 transition-colors font-medium flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add to List
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Word List */}
                        <div className="lg:col-span-2">
                            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                                    <h3 className="font-semibold text-slate-200">Word List ({words.length})</h3>
                                    {saving && (
                                        <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium animate-pulse">
                                            <Save className="w-3 h-3" />
                                            Saving...
                                        </div>
                                    )}
                                </div>
                                <div className="divide-y divide-slate-700/50 max-h-[800px] overflow-y-auto">
                                    {words.map((w, i) => {
                                        const isWordEditing = editingIndex === i;

                                        if (!isWordEditing) {
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => setEditingIndex(i)}
                                                    className="p-4 hover:bg-slate-700/50 transition-colors cursor-pointer group flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-lg font-bold text-slate-200 w-24">{w.character}</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {w.tags.map(tag => (
                                                                <span key={tag} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md font-medium border border-slate-600">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-cyan-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Edit
                                                    </span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={i} className="p-6 bg-cyan-900/10 border-l-4 border-cyan-500 space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Editing Word</h4>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveWord(i); setEditingIndex(null); }}
                                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingIndex(null); }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors text-sm font-medium"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            Done
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-400 font-medium">Character/Word</label>
                                                        <input
                                                            value={w.character}
                                                            onChange={e => handleWordUpdate(i, 'character', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-slate-400 font-medium">Tags</label>
                                                        <TagAutocomplete
                                                            selectedTags={w.tags}
                                                            onChange={(newTags) => handleWordUpdate(i, 'tags', newTags)}
                                                            placeholder="Edit tags..."
                                                        />
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-700/50 pt-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-semibold text-slate-300">Examples</span>
                                                        <button
                                                            onClick={() => handleGenerateExamples(i)}
                                                            disabled={generatingIndex === i}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${generatingIndex === i
                                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                                : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                                                                }`}
                                                        >
                                                            {generatingIndex === i ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="w-3 h-3" />
                                                            )}
                                                            {generatingIndex === i ? 'Generating AI...' : 'Generate with AI'}
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {[0, 1, 2].map(exIdx => (
                                                            <textarea
                                                                key={exIdx}
                                                                value={(w.examples || [])[exIdx] || ''}
                                                                onChange={e => handleExampleUpdate(i, exIdx, e.target.value)}
                                                                placeholder={`Example sentence ${exIdx + 1}...`}
                                                                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none min-h-[60px] placeholder-slate-600"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {words.length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                                            <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                                            <p>No words added yet.</p>
                                            <p className="text-sm opacity-60">Use the form on the left to add words.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="flex justify-end pt-6 border-t border-slate-700">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-8 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30 font-bold"
                            >
                                {saving ? 'Creating...' : 'Create Word Pack'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CreateWordPack;
