import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Tag, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { batchAddWords, fetchProfileTags } from '../services/profileService';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        setIsSubmitting(true);
        setError(null);
        setResult(null);

        const words = text.split('\n');

        // Validation: No mixed languages in a single line
        const hasChinese = (s: string) => /[\u4e00-\u9fa5]/.test(s);
        const hasEnglish = (s: string) => /[a-zA-Z]/.test(s);

        for (let i = 0; i < words.length; i++) {
            const line = words[i].trim();
            if (line.length === 0) continue;

            if (hasChinese(line) && hasEnglish(line)) {
                setError(`Line ${i + 1}: Cannot mix English and Chinese in the same word ("${line}").`);
                setIsSubmitting(false);
                return;
            }
        }

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
        }
    };

    const filteredAutocompleteTags = availableTags.filter(
        tag => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
    );

    return (
        <div className="flex flex-col h-full bg-cream font-rounded">
            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-md mx-auto space-y-6 pb-20">
                    <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-4 border-coffee">
                        <label className="block text-xs font-black text-coffee uppercase tracking-wider opacity-60 mb-3">
                            Paste words here (one per line)
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={`飛機\n救護員\nkangaroo\n姐姐`}
                            className="w-full h-48 p-4 rounded-2xl bg-coffee/5 border-2 border-coffee/10 focus:border-salmon focus:outline-none focus:ring-4 focus:ring-salmon/20 text-coffee font-bold font-mono text-base resize-none placeholder:text-coffee/20 transition-all mb-4"
                            disabled={isSubmitting}
                        />

                        <label className="block text-xs font-black text-coffee uppercase tracking-wider opacity-60 mb-3">
                            Tags
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

                        <p className="mt-4 text-xs font-bold text-coffee/40">
                            Duplicates will be automatically skipped.
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
        </div>
    );
};
