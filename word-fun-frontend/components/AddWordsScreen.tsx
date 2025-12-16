import React, { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { batchAddWords } from '../services/profileService';

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
    const navigate = useNavigate();

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
            const res = await batchAddWords(profileId, words);
            setResult(res);
            if (res.added > 0) {
                setText('');
                onWordsAdded(); // Trigger refresh
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add words');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-cream font-rounded">
            {/* Header Removed */}

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-4 border-coffee">
                        <label className="block text-xs font-black text-coffee uppercase tracking-wider opacity-60 mb-3">
                            Paste words here (one per line)
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={`apple\nbanana\ncherry`}
                            className="w-full h-64 p-4 rounded-2xl bg-coffee/5 border-2 border-coffee/10 focus:border-salmon focus:outline-none focus:ring-4 focus:ring-salmon/20 text-coffee font-bold font-mono text-base resize-none placeholder:text-coffee/20 transition-all"
                            disabled={isSubmitting}
                        />
                        <p className="mt-3 text-xs font-bold text-coffee/40">
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
