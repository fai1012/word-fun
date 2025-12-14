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
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header Removed */}

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Paste words here (one per line)
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={`apple\nbanana\ncherry`}
                            className="w-full h-64 p-3 rounded-lg border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-50 text-slate-700 font-medium font-mono text-base resize-none"
                            disabled={isSubmitting}
                        />
                        <p className="mt-2 text-xs text-slate-400">
                            Duplicates will be automatically skipped.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 mb-1">
                                <CheckCircle className="w-5 h-5 shrink-0" />
                                <p className="font-bold">Proceesed!</p>
                            </div>
                            <p className="text-sm opacity-90 ml-8">
                                Added {result.added} new words.<br />
                                Skipped {result.skipped} duplicates.
                            </p>
                            <button
                                onClick={() => navigate(`/profiles/${profileId}/study`)}
                                className="mt-3 ml-8 text-xs font-bold text-green-800 underline decoration-2 underline-offset-2 hover:text-green-900"
                            >
                                Go to Study
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !text.trim()}
                        className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
