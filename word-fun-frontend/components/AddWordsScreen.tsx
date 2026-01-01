import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Tag, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { batchAddWords, fetchProfileTags, validateWords } from '../services/profileService';
import { fetchWordPacks, WordPackData } from '../services/wordPackService';
import { BookOpen, Check, Loader2 } from 'lucide-react';

interface AddWordsScreenProps {
    profileId: string;
    onBack: () => void;
    onWordsAdded: () => void;
}

export const AddWordsScreen: React.FC<AddWordsScreenProps> = ({ profileId, onBack, onWordsAdded }) => {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const navigate = useNavigate();
    const autocompleteRef = useRef<HTMLDivElement>(null);

    // Word Pack State
    const [showPackModal, setShowPackModal] = useState(false);
    const [packs, setPacks] = useState<WordPackData[]>([]);
    const [loadingPacks, setLoadingPacks] = useState(false);
    const [selectedPackForPreview, setSelectedPackForPreview] = useState<WordPackData | null>(null);

    // Validation Modal State
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [invalidWordsFound, setInvalidWordsFound] = useState<string[]>([]);
    const [pendingWords, setPendingWords] = useState<string[]>([]);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const tags = await fetchProfileTags(profileId);
                setAvailableTags(tags);
            } catch (err) {
                console.error('Failed to load tags:', err);
            }
        };
        loadTags();
    }, [profileId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                setShowAutocomplete(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddTag = (tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !selectedTags.includes(trimmedTag)) {
            setSelectedTags([...selectedTags, trimmedTag]);
        }
        setTagInput('');
        setShowAutocomplete(false);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    };

    const handleOpenPacks = async () => {
        setShowPackModal(true);
        setSelectedPackForPreview(null);
        if (packs.length === 0) {
            setLoadingPacks(true);
            try {
                const data = await fetchWordPacks();
                setPacks(data);
            } catch (err) {
                console.error("Failed to load packs", err);
            } finally {
                setLoadingPacks(false);
            }
        }
    };

    const handleSelectPackForPreview = (pack: WordPackData) => {
        setSelectedPackForPreview(pack);
    };

    const handleConfirmImport = async (pack: WordPackData) => {
        setIsSubmitting(true);
        setError(null);
        setResult(null);
        setShowPackModal(false);

        // Pass words with their tags from the pack
        const words = pack.words.map(w => ({
            text: w.character,
            tags: w.tags
        }));

        try {
            const res = await batchAddWords(profileId, words, []); // No global tags needed here as pack has its own
            setResult(res);
            if (res.added > 0 || res.skipped > 0) {
                onWordsAdded(); // Trigger refresh
                const updatedTags = await fetchProfileTags(profileId);
                setAvailableTags(updatedTags);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to import word pack');
        } finally {
            setIsSubmitting(false);
            setSelectedPackForPreview(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        setIsSubmitting(true);
        setError(null);
        setResult(null);

        const words = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);

        // Validation: No mixed languages in a single line
        const hasChinese = (s: string) => /[\u4e00-\u9fa5]/.test(s);
        const hasEnglish = (s: string) => /[a-zA-Z]/.test(s);

        for (let i = 0; i < words.length; i++) {
            const line = words[i];
            if (hasChinese(line) && hasEnglish(line)) {
                setError(`Line ${i + 1}: Cannot mix English and Chinese in the same word ("${line}").`);
                setIsSubmitting(false);
                return;
            }
        }

        try {
            // Pre-check for validity
            const validationResults = await validateWords(profileId, words);
            const invalidWords = validationResults.filter(r => !r.isValid);

            if (invalidWords.length > 0) {
                setInvalidWordsFound(invalidWords.map(w => w.text));
                setPendingWords(words);
                setShowValidationModal(true);
                setIsSubmitting(false);
                return;
            }

            await processAddWords(words);
        } catch (err: any) {
            setError(err.message || 'Failed to add words');
            setIsSubmitting(false);
        }
    };

    const processAddWords = async (words: string[]) => {
        setIsSubmitting(true);
        setError(null);
        setResult(null);
        try {
            const res = await batchAddWords(profileId, words, selectedTags);
            setResult(res);
            if (res.added > 0 || res.skipped > 0) {
                setText('');
                setSelectedTags([]);
                onWordsAdded(); // Trigger refresh
                // Refresh available tags after adding
                const updatedTags = await fetchProfileTags(profileId);
                setAvailableTags(updatedTags);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add words');
        } finally {
            setIsSubmitting(false);
            setShowValidationModal(false);
        }
    };

    const filteredAutocompleteTags = availableTags.filter(
        tag => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
    );

    return (
        <div className="flex flex-col h-full bg-cream font-rounded relative text-coffee">
            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-md mx-auto space-y-6 pb-20">
                    <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-4 border-coffee">

                        {/* Prominent Import Feature CTA */}
                        <div className="mb-8">
                            <button
                                onClick={handleOpenPacks}
                                className="w-full bg-cream border-2 border-coffee border-dashed hover:border-solid hover:border-salmon hover:bg-salmon/5 p-5 rounded-2xl group transition-all flex items-center gap-4 relative overflow-hidden"
                            >
                                <div className="w-12 h-12 bg-salmon rounded-full flex items-center justify-center shrink-0 shadow-sm rotate-3 group-hover:rotate-12 transition-transform">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left relative z-10">
                                    <h3 className="font-black text-lg text-coffee group-hover:text-salmon transition-colors">
                                        Add some common words by category!
                                    </h3>
                                    <p className="text-xs font-bold text-coffee/50">
                                        Don't want to type? Pick a ready-made pack.
                                    </p>
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white/50 to-transparent pointer-events-none" />
                            </button>
                        </div>

                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-xs font-black text-coffee uppercase tracking-wider opacity-60">
                                Or paste your own words (one per line)
                            </label>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={`飛機\n救護員\nkangaroo\n姐姐`}
                            className="w-full h-48 p-4 rounded-2xl bg-coffee/5 border-2 border-coffee/10 focus:border-salmon focus:outline-none focus:ring-4 focus:ring-salmon/20 text-coffee font-bold font-mono text-base resize-none placeholder:text-coffee/20 transition-all mb-4"
                            disabled={isSubmitting}
                        />

                        {/* 
                        <label className="block text-xs font-black text-coffee uppercase tracking-wider opacity-60 mb-3">
                            Tags (Add tag to group words for revision.)
                        </label>
                        <div className="relative" ref={autocompleteRef}>
                            <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-coffee/5 border-2 border-coffee/10 focus-within:border-salmon transition-all min-h-[50px]">
                                {selectedTags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 bg-salmon text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-coffee/50 transition-colors">
                                            <X className="w-3 h-3 stroke-[3]" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => {
                                        setTagInput(e.target.value);
                                        setShowAutocomplete(true);
                                    }}
                                    onFocus={() => setShowAutocomplete(true)}
                                    placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-coffee font-bold text-sm min-w-[100px]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tagInput) {
                                            e.preventDefault();
                                            handleAddTag(tagInput);
                                        }
                                    }}
                                />
                            </div>

                            {showAutocomplete && (tagInput || filteredAutocompleteTags.length > 0) && (
                                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-coffee rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-200">
                                    {filteredAutocompleteTags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto">
                                            {filteredAutocompleteTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => handleAddTag(tag)}
                                                    className="px-3 py-1.5 bg-matcha/10 hover:bg-matcha/20 text-coffee font-bold text-xs rounded-full border border-matcha/20 transition-all flex items-center gap-1.5"
                                                >
                                                    <Tag className="w-3 h-3 opacity-50" />
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {tagInput && !availableTags.includes(tagInput) && (
                                        <button
                                            onClick={() => handleAddTag(tagInput)}
                                            className="w-full px-3 py-2 text-left bg-salmon/5 hover:bg-salmon/10 text-salmon font-black text-xs rounded-xl transition-colors flex items-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Create tag "{tagInput}"
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        */}

                        <p className="mt-4 text-xs font-bold text-coffee/40">
                            Duplicates will be automatically skipped. New tags will be merged.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-salmon/10 text-salmon p-4 rounded-2xl flex items-center gap-3 border-2 border-salmon/20 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <AlertCircle className="w-6 h-6 shrink-0 stroke-[2.5]" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="bg-matcha/10 text-matcha p-5 rounded-2xl border-2 border-matcha/20 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle className="w-6 h-6 shrink-0 stroke-[2.5]" />
                                <p className="font-black text-lg">Processed!</p>
                            </div>
                            <p className="text-sm font-medium ml-9 opacity-80 leading-relaxed">
                                Added {result.added} new words.<br />
                                Skipped {result.skipped} duplicates.
                            </p>
                            <button
                                onClick={() => navigate(`/profiles/${profileId}/study`)}
                                className="mt-3 ml-9 text-xs font-black text-matcha underline decoration-2 underline-offset-4 hover:opacity-80 transition-opacity"
                            >
                                Go to Study →
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !text.trim()}
                        className="w-full bg-salmon text-white font-black text-lg py-4 rounded-2xl border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,0.4)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,0.4)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:active:transform-none"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Adding...
                            </>
                        ) : (
                            'Add Words'
                        )}
                    </button>
                </div>
            </div>

            {/* Word Pack Import Modal */}
            {showPackModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-3xl p-6 border-4 border-coffee shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-coffee">
                                    {selectedPackForPreview ? selectedPackForPreview.name : 'Choose a category!'}
                                </h3>
                                {selectedPackForPreview && (
                                    <p className="text-xs font-bold text-coffee/40">Previewing {selectedPackForPreview.words.length} words</p>
                                )}
                            </div>
                            <button onClick={() => setShowPackModal(false)} className="text-coffee/50 hover:text-coffee transition-colors p-2">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 custom-scrollbar">
                            {loadingPacks ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-salmon" />
                                    <p className="text-sm font-black text-coffee/40">Loading packs...</p>
                                </div>
                            ) : selectedPackForPreview ? (
                                // PREVIEW MODE
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedPackForPreview.words.map((w, idx) => (
                                            <div key={idx} className="bg-cream/40 border-2 border-coffee/5 p-2 rounded-2xl flex flex-col items-center justify-center gap-1 group">
                                                <span className="text-base font-black text-coffee">{w.character}</span>
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {w.tags.map(t => (
                                                        <span key={t} className="text-[10px] font-bold text-salmon/60 uppercase tracking-tight">#{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-matcha/10 border-2 border-matcha/20 p-4 rounded-2xl flex items-start gap-3">
                                        <div className="w-8 h-8 bg-matcha/20 rounded-full flex items-center justify-center shrink-0">
                                            <Check className="w-5 h-5 text-matcha" />
                                        </div>
                                        <p className="text-xs font-bold text-matcha/80 leading-relaxed">
                                            Great choice! These words will be added to your study list. We'll even generate AI examples for you automatically.
                                        </p>
                                    </div>
                                </div>
                            ) : packs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <BookOpen className="w-16 h-16 mb-4" />
                                    <p className="text-center font-bold">No word packs available yet.</p>
                                </div>
                            ) : (
                                // LIST MODE
                                packs.map(pack => (
                                    <button
                                        key={pack.id}
                                        onClick={() => handleSelectPackForPreview(pack)}
                                        className="w-full bg-cream/50 border-2 border-coffee/10 hover:border-salmon hover:bg-salmon/5 p-5 rounded-2xl text-left transition-all group flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-2 border-coffee/5 shadow-sm group-hover:scale-110 transition-transform">
                                                <span className="text-xl">📚</span>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg text-coffee group-hover:text-salmon transition-colors">{pack.name}</h4>
                                                <p className="text-xs font-bold text-coffee/40 uppercase tracking-widest">{pack.words.length} Words</p>
                                            </div>
                                        </div>
                                        <div className="bg-salmon text-white px-4 py-2 rounded-full text-xs font-black shadow-[2px_2px_0px_0px_rgba(93,64,55,0.4)] group-hover:translate-x-[-2px] transition-transform">
                                            View Pack
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {selectedPackForPreview && (
                            <div className="mt-4 pt-4 border-t-4 border-coffee/5 flex gap-3 shrink-0">
                                <button
                                    onClick={() => setSelectedPackForPreview(null)}
                                    className="flex-1 bg-coffee/5 text-coffee font-black py-3 rounded-2xl hover:bg-coffee/10 transition-colors border-2 border-coffee/10"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => handleConfirmImport(selectedPackForPreview)}
                                    className="flex-[2] bg-salmon text-white font-black py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.4)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center justify-center gap-2"
                                >
                                    Add All Words!
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Validation Confirmation Modal */}
            {showValidationModal && (
                <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 border-4 border-coffee shadow-2xl animate-in zoom-in-95 flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 bg-salmon/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-salmon" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-coffee">Wait a second!</h3>
                                <p className="text-sm font-bold text-coffee/60 mt-1">
                                    Some words look a bit unusual. Are you sure they're correct?
                                </p>
                            </div>
                        </div>

                        <div className="bg-cream/50 border-2 border-coffee/5 p-4 rounded-2xl max-h-40 overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                                {invalidWordsFound.map((word, idx) => (
                                    <span key={idx} className="bg-white border-2 border-coffee/10 px-3 py-1 rounded-full text-xs font-black text-coffee/70">
                                        {word}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => processAddWords(pendingWords)}
                                className="w-full bg-salmon text-white font-black py-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.4)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                            >
                                Yes, Add Anyway
                            </button>
                            <button
                                onClick={() => setShowValidationModal(false)}
                                className="w-full bg-coffee/5 text-coffee font-black py-4 rounded-2xl hover:bg-coffee/10 transition-colors border-2 border-coffee/10"
                            >
                                Let me check
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
