
import React, { useState, useEffect, useRef } from 'react';
import { FlashcardData } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { TrendingUp, Circle, Trophy, BookOpen, Sparkles, X, Trash2, Plus, GripVertical, Tag, Check } from 'lucide-react';
import { fetchProfileTags } from '../services/profileService';
import { useI18n } from '../services/i18nService';

interface SummaryScreenProps {
    profileId: string;
    cards: FlashcardData[];
    masteryThreshold: number;
    onUpdateWord: (wordId: string, updates: Partial<FlashcardData>) => Promise<void>;
    onDeleteWord: (wordId: string) => Promise<void>;
}

type FilterTab = 'MASTERED' | 'LEARNING' | 'NEW';

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ profileId, cards, masteryThreshold, onUpdateWord, onDeleteWord }) => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<FilterTab>('LEARNING');
    const [languageFilter, setLanguageFilter] = useState<'all' | 'zh' | 'en'>('all');
    const [filteredModalAttributes, setFilteredModalAttributes] = useState<{ title: string, cards: FlashcardData[] } | null>(null);

    // Editing State
    const [editingWordId, setEditingWordId] = useState<string | null>(null);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');
    const [wordToDelete, setWordToDelete] = useState<string | null>(null);

    // Autocomplete State
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const editCardRef = useRef<HTMLDivElement>(null);
    const tagInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close autocomplete if clicked outside
            if (showAutocomplete && autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                setShowAutocomplete(false);
            }

            // Close edit mode if clicked outside the edit card
            if (editingWordId && editCardRef.current && !editCardRef.current.contains(event.target as Node)) {
                // Determine if we clicked on an "Edit" trigger (which might be the card itself).
                // Actually, the card itself is replaced by the edit card, so clicking the *old* card isn't possible.
                // But if they click another card, that card's onClick will trigger startEditing for that card.
                // We just need to ensure we don't conflict. 
                // Since startEditing sets a NEW editingWordId, it overrides.
                // So clicking 'empty space' calls stopEditing.
                // Clicking 'another card' calls stopEditing via this listener? 
                // Wait. If I click another card, this listener fires first?
                // Events bubble. The click on another card will trigger this listener (document level).
                // If this listener calls stopEditing, it clears local state.
                // Then the other card's onClick fires?
                // If stopEditing clears state, then startEditing sets it.
                // BUT startEditing uses `setEditingWordId`.
                // React batching might handle it, or there might be a race.
                // Usually "click outside" listeners use `mousedown` to fire before `click`.
                // The current effect uses `mousedown`.
                // If I click another card:
                // 1. mousedown on document calls `stopEditing` -> `editingWordId` = null.
                // 2. mouseup/click on other card calls `startEditing` -> `editingWordId` = newId.
                // This seems fine.
                stopEditing();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAutocomplete, editingWordId]);

    useEffect(() => {
        const loadTags = async () => {
            if (!profileId) return;
            try {
                const tags = await fetchProfileTags(profileId);
                setAvailableTags(tags);
            } catch (err) {
                console.error('Failed to load tags:', err);
            }
        };
        loadTags();
    }, [profileId]);

    // Refresh tags when entering edit mode or when tags change (to keep availableTags fresh-ish)
    // Actually simpler: just re-fetch when finishing an edit if we added a new tag?
    // For now, initial load is enough, and we can optimistic add new tags to availableTags.

    // 1. Filter by Language
    const filteredCards = (cards || []).filter(c => {
        if (!c) return false;
        if (languageFilter === 'all') return true;
        if (languageFilter === 'zh') return c.language === 'zh' || !c.language; // Default old to zh
        return c.language === 'en';
    });

    // 2. Calculate Statistics based on filtered cards
    const totalCards = filteredCards.length;

    const revisedCards = filteredCards.filter(c => (c.revisedCount || 0) > 0);
    const masteredCards = filteredCards.filter(c => (c.correctCount || 0) >= masteryThreshold);
    const learningCards = revisedCards.filter(c => (c.correctCount || 0) < masteryThreshold);
    const newCards = filteredCards.filter(c => !c.revisedCount || c.revisedCount === 0);

    const masteryRate = totalCards > 0 ? Math.round((masteredCards.length / totalCards) * 100) : 0;

    // Helper to format relative time
    const formatTimeAgo = (dateString?: Date | string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return t('common.just_now');
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return t('common.m_ago', [diffInMinutes]);
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('common.h_ago', [diffInHours]);
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return t('common.d_ago', [diffInDays]);
        return date.toLocaleDateString();
    };

    // Determine displayed list details
    let currentList: FlashcardData[] = [];
    if (activeTab === 'LEARNING') {
        currentList = [...learningCards].sort((a, b) => {
            const timeA = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
            const timeB = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
            return timeB - timeA;
        });
    } else if (activeTab === 'MASTERED') {
        currentList = [...masteredCards].sort((a, b) => {
            const timeA = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
            const timeB = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
            return timeB - timeA;
        });
    } else {
        currentList = newCards;
    }

    const startEditing = (card: FlashcardData) => {
        setEditingWordId(card.id || null);
        setEditTags(card.tags ? [...card.tags] : []);
        setNewTagInput('');
        setShowAutocomplete(false);
    };

    const stopEditing = () => {
        setEditingWordId(null);
        setEditTags([]);
        setNewTagInput('');
        setShowAutocomplete(false);
    };

    const handleAddTag = (val: string) => {
        const trimmed = val.trim();
        if (trimmed && !editTags.includes(trimmed)) {
            const nextTags = [...editTags, trimmed];
            setEditTags(nextTags);
            setNewTagInput('');
            setShowAutocomplete(false);

            // Add to available tags if not present
            if (!availableTags.includes(trimmed)) {
                setAvailableTags(prev => [...prev, trimmed]);
            }

            // Auto-save tags
            if (editingWordId) {
                onUpdateWord(editingWordId, { tags: nextTags });
            }
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const nextTags = editTags.filter(t => t !== tagToRemove);
        setEditTags(nextTags);
        // Auto-save tags
        if (editingWordId) {
            onUpdateWord(editingWordId, { tags: nextTags });
        }
    };

    const handleDeleteWord = async () => {
        if (wordToDelete) {
            await onDeleteWord(wordToDelete);
            setWordToDelete(null);
            stopEditing();
        }
    };

    const filteredAutocompleteTags = availableTags.filter(
        tag => tag.toLowerCase().includes(newTagInput.toLowerCase()) && !editTags.includes(tag)
    );




    return (
        <div className="w-full max-w-lg mx-auto px-4 pb-24 pt-8 font-rounded text-coffee">
            <h1 className="text-2xl font-bold text-coffee mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-7 h-7 text-salmon stroke-[3]" />
                    <span className="tracking-tight">{t('stats.title')}</span>
                </div>
            </h1>

            {/* Language Toggle */}
            <div className="flex p-1.5 bg-coffee/10 rounded-2xl mb-8">
                {(['all', 'zh', 'en'] as const).map(lang => (
                    <button
                        key={lang}
                        onClick={() => setLanguageFilter(lang)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl capitalize transition-all ${languageFilter === lang
                            ? 'bg-white text-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.2)] border border-coffee/10'
                            : 'text-coffee/50 hover:text-coffee/70'
                            }`}
                    >
                        {lang === 'all' ? t('stats.all') : lang === 'zh' ? t('stats.zh') : t('stats.en')}
                    </button>
                ))}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee flex flex-col justify-center items-center text-center">
                    <div className="text-coffee/50 text-[10px] font-bold uppercase tracking-widest mb-1">{t('stats.total_words')}</div>
                    <div className="text-4xl font-bold text-coffee">{totalCards}</div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee flex flex-col justify-center items-center text-center">
                    <div className="text-coffee/50 text-[10px] font-bold uppercase tracking-widest mb-1">{t('stats.mastery')}</div>
                    <div className="text-4xl font-bold text-salmon">{masteryRate}%</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee mb-8">
                <h3 className="text-sm font-bold text-coffee mb-4 uppercase tracking-wide opacity-80">{t('stats.deck_status')}</h3>

                <div className="flex h-5 rounded-full overflow-hidden bg-coffee/10 mb-5 border-2 border-coffee/10">
                    <div className="bg-matcha transition-all duration-1000 border-r-2 border-white/20" style={{ width: `${totalCards > 0 ? (masteredCards.length / totalCards) * 100 : 0}%` }}></div>
                    <div className="bg-yolk transition-all duration-1000 border-r-2 border-white/20" style={{ width: `${totalCards > 0 ? (learningCards.length / totalCards) * 100 : 0}%` }}></div>
                </div>

                <div className="flex justify-between text-xs font-bold text-coffee/60">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-matcha border border-coffee/20"></div>
                        <span>{t('stats.mastered_label', [masteredCards.length])}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-yolk border border-coffee/20"></div>
                        <span>{t('stats.learning_label', [learningCards.length])}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-coffee/20"></div>
                        <span>{t('stats.new_label', [newCards.length])}</span>
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <h3 className="text-lg font-bold text-coffee mb-4 flex items-center gap-2">
                {t('stats.recent_activity')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Mastered Stats - Only show if we have data or generic empty state? Standard UI */}
                <div className="bg-white p-4 rounded-3xl border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-matcha/20 text-matcha rounded-lg border border-matcha/30">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-coffee text-sm">{t('stats.newly_mastered')}</h4>
                    </div>
                    <div className="flex justify-between items-start">
                        <button
                            onClick={() => {
                                const list = filteredCards.filter(c => {
                                    if (!c.masteredAt) return false;
                                    const d = new Date(c.masteredAt);
                                    const diffTime = Math.abs(new Date().getTime() - d.getTime());
                                    return diffTime <= (7 * 24 * 60 * 60 * 1000);
                                });
                                setFilteredModalAttributes({ title: t('stats.modal_title_mastered_week'), cards: list });
                            }}
                            className="text-left group cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-salmon transition-colors">{t('stats.period_week')}</div>
                            <div className="text-2xl font-bold text-coffee group-hover:text-salmon transition-colors">
                                {filteredCards.filter(c => {
                                    if (!c.masteredAt) return false;
                                    const d = new Date(c.masteredAt);
                                    const diffTime = Math.abs(new Date().getTime() - d.getTime());
                                    return diffTime <= (7 * 24 * 60 * 60 * 1000);
                                }).length}
                            </div>
                        </button>
                        <button
                            onClick={() => {
                                const list = filteredCards.filter(c => {
                                    if (!c.masteredAt) return false;
                                    const d = new Date(c.masteredAt);
                                    const today = new Date();
                                    return d.toDateString() === today.toDateString();
                                });
                                setFilteredModalAttributes({ title: t('stats.modal_title_mastered_today'), cards: list });
                            }}
                            className="text-right group cursor-pointer hover:bg-slate-50 p-2 -mr-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-salmon transition-colors">{t('stats.period_today')}</div>
                            <div className="text-2xl font-bold text-coffee group-hover:text-salmon transition-colors">
                                {filteredCards.filter(c => {
                                    if (!c.masteredAt) return false;
                                    const d = new Date(c.masteredAt);
                                    const today = new Date();
                                    return d.toDateString() === today.toDateString();
                                }).length}
                            </div>
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-coffee text-sm">{t('stats.words_reviewed')}</h4>
                    </div>
                    <div className="flex justify-between items-start">
                        <button
                            onClick={() => {
                                const list = filteredCards.filter(c => {
                                    if (!c.lastReviewedAt) return false;
                                    const d = new Date(c.lastReviewedAt);
                                    const diffTime = Math.abs(new Date().getTime() - d.getTime());
                                    return diffTime <= (7 * 24 * 60 * 60 * 1000);
                                });
                                setFilteredModalAttributes({ title: t('stats.modal_title_reviewed_week'), cards: list });
                            }}
                            className="text-left group cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-indigo-500 transition-colors">{t('stats.period_week')}</div>
                            <div className="text-2xl font-bold text-coffee group-hover:text-indigo-500 transition-colors">
                                {filteredCards.filter(c => {
                                    if (!c.lastReviewedAt) return false;
                                    const d = new Date(c.lastReviewedAt);
                                    const diffTime = Math.abs(new Date().getTime() - d.getTime());
                                    return diffTime <= (7 * 24 * 60 * 60 * 1000);
                                }).length}
                            </div>
                        </button>
                        <button
                            onClick={() => {
                                const list = filteredCards.filter(c => {
                                    if (!c.lastReviewedAt) return false;
                                    const d = new Date(c.lastReviewedAt);
                                    const today = new Date();
                                    return d.toDateString() === today.toDateString();
                                });
                                setFilteredModalAttributes({ title: t('stats.modal_title_reviewed_today'), cards: list });
                            }}
                            className="text-right group cursor-pointer hover:bg-slate-50 p-2 -mr-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-indigo-500 transition-colors">{t('stats.period_today')}</div>
                            <div className="text-2xl font-bold text-coffee group-hover:text-indigo-500 transition-colors">
                                {filteredCards.filter(c => {
                                    if (!c.lastReviewedAt) return false;
                                    const d = new Date(c.lastReviewedAt);
                                    const today = new Date();
                                    return d.toDateString() === today.toDateString();
                                }).length}
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex p-1.5 bg-coffee/10 rounded-2xl mb-6">
                <button
                    onClick={() => setActiveTab('MASTERED')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'MASTERED'
                        ? 'bg-white text-matcha-dark shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]'
                        : 'text-coffee/50 hover:text-coffee/70'
                        } `}
                >
                    <Trophy className="w-3.5 h-3.5" />
                    {t('stats.tab_mastered')}
                </button>
                <button
                    onClick={() => setActiveTab('LEARNING')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'LEARNING'
                        ? 'bg-white text-yolk-dark shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]'
                        : 'text-coffee/50 hover:text-coffee/70'
                        } `}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    {t('stats.tab_learning')}
                </button>
                <button
                    onClick={() => setActiveTab('NEW')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'NEW'
                        ? 'bg-white text-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]'
                        : 'text-coffee/50 hover:text-coffee/70'
                        } `}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('stats.tab_new')}
                </button>
            </div>

            {/* Word List */}
            <h3 className="text-lg font-bold text-coffee mb-4 capitalize flex items-center gap-2">
                {t('stats.word_list_title', [activeTab.toLowerCase()])}
                <span className="text-xs font-bold text-coffee/30 bg-coffee/5 px-2 py-0.5 rounded-full">{currentList.length}</span>
            </h3>

            {currentList.length === 0 ? (
                <div className="text-center py-12 text-coffee/30 bg-coffee/5 rounded-3xl border-2 border-dashed border-coffee/10">
                    <Circle className="w-10 h-10 mx-auto mb-3 opacity-30 stroke-[3]" />
                    <p className="text-sm font-bold">{t('stats.no_words_found', [activeTab.toLowerCase()])}</p>
                </div>
            ) : (
                <div className="space-y-3 pb-24">
                    {currentList.map((card, idx) => {
                        const progressPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));
                        const isEditing = editingWordId === card.id;

                        let colorClass = 'text-coffee/40';
                        if (activeTab !== 'NEW') {
                            if (progressPercent < 50) colorClass = 'text-salmon';
                            else if (progressPercent < 80) colorClass = 'text-yolk-dark';
                            else colorClass = 'text-matcha-dark';
                        }

                        // Edit Mode Card
                        if (isEditing) {
                            return (
                                <div ref={editCardRef} key={card.id || idx} className="bg-white p-4 rounded-2xl border-2 border-salmon/20 shadow-lg ring-2 ring-salmon/10 transition-all cursor-default relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="min-w-[3.5rem] h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-coffee font-noto-serif-hk bg-cream border-2 border-coffee/10">
                                                {card.character}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-coffee/40 uppercase tracking-wide mb-1">{t('stats.editing_tags')}</div>
                                                <div className="text-xs font-bold text-coffee/60">{t('stats.auto_saving')}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => card.id && setWordToDelete(card.id)}
                                            className="p-1.5 hover:bg-salmon/10 rounded-full text-salmon/60 hover:text-salmon transition-colors absolute top-4 right-4"
                                            title="Delete Word"
                                        >
                                            <Trash2 className="w-4 h-4 stroke-[3]" />
                                        </button>
                                    </div>

                                    {/* Tag Inputs */}
                                    <div className="relative mb-4" ref={autocompleteRef}>
                                        <div
                                            className="flex flex-wrap gap-2 p-2 rounded-2xl bg-coffee/5 border-2 border-coffee/10 focus-within:border-salmon transition-all min-h-[50px] cursor-text"
                                            onClick={() => tagInputRef.current?.focus()}
                                        >
                                            {editTags.map(tag => (
                                                <span
                                                    key={tag}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center gap-1 bg-salmon text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm animate-in zoom-in duration-200 cursor-default"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="hover:text-coffee/50 transition-colors"
                                                    >
                                                        <X className="w-3 h-3 stroke-[3]" />
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                ref={tagInputRef}
                                                type="text"
                                                value={newTagInput}
                                                onChange={(e) => {
                                                    setNewTagInput(e.target.value);
                                                    setShowAutocomplete(true);
                                                }}
                                                onFocus={() => setShowAutocomplete(true)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newTagInput) {
                                                        e.preventDefault();
                                                        handleAddTag(newTagInput);
                                                    }
                                                }}
                                                placeholder={editTags.length === 0 ? t('stats.add_tags_placeholder') : ""}
                                                className="flex-1 bg-transparent border-none focus:ring-0 text-coffee font-bold text-sm min-w-[100px] placeholder:text-coffee/30 p-0"
                                                autoFocus
                                            />
                                        </div>

                                        {/* Autocomplete Dropdown (Tag Cloud Style) */}
                                        {showAutocomplete && (newTagInput || filteredAutocompleteTags.length > 0) && (
                                            <div className="absolute top-full left-0 z-50 w-full mt-2 bg-white border-2 border-coffee rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-200">
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

                                                {newTagInput && !availableTags.includes(newTagInput) && (
                                                    <button
                                                        onClick={() => handleAddTag(newTagInput)}
                                                        className="w-full px-3 py-2 text-left bg-salmon/5 hover:bg-salmon/10 text-salmon font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        {t('stats.create_tag', [newTagInput])}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>


                                </div>
                            );
                        }

                        // Normal View Card
                        return (
                            <div
                                key={card.id || idx}
                                onClick={() => startEditing(card)}
                                className="bg-white p-4 rounded-2xl border-2 border-coffee/10 shadow-sm flex items-center justify-between group hover:border-coffee/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-coffee/0 group-hover:bg-salmon/50 transition-colors"></div>

                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={`min-w-[3rem] h-12 rounded-xl flex items-center justify-center text-xl font-bold text-coffee font-noto-serif-hk whitespace-nowrap shadow-inner ${activeTab === 'NEW' ? 'bg-coffee/5' : 'bg-cream border-2 border-coffee/10'} `}>
                                        {card.character}
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-0">
                                        {/* Tags Display */}
                                        {card.tags && card.tags.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {card.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-coffee/5 text-coffee/50 text-[10px] font-bold rounded-lg border border-coffee/5 whitespace-nowrap">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {card.tags.length > 3 && (
                                                    <span className="px-1.5 py-0.5 text-coffee/30 text-[10px] font-bold whitespace-nowrap">
                                                        +{card.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-coffee/20 italic group-hover:text-coffee/40 transition-colors">
                                                {t('stats.no_tags')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    {activeTab === 'NEW' ? (
                                        <div className="text-[10px] font-bold tracking-wider text-coffee/40 bg-coffee/5 px-2 py-1 rounded-lg uppercase">{t('stats.tab_new')}</div>
                                    ) : (
                                        <>
                                            <div className={`text-sm font-bold ${colorClass}`}>{progressPercent}%</div>
                                            <div className="text-[10px] font-bold text-coffee/30 group-hover:text-coffee/50 flex flex-col items-end">
                                                {card.lastReviewedAt && <span>{t('study.reviewed_at', [formatTimeAgo(card.lastReviewedAt)])}</span>}
                                                <span>{t('study.review_count', [card.revisedCount])}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Modal for filtered lists */}
            {filteredModalAttributes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border-4 border-coffee">
                        <div className="flex items-center justify-between p-5 border-b-2 border-coffee/10">
                            <h3 className="font-bold text-coffee text-lg">{filteredModalAttributes.title}</h3>
                            <button
                                onClick={() => setFilteredModalAttributes(null)}
                                className="p-2 hover:bg-salmon hover:text-white rounded-xl transition-colors text-coffee/40"
                            >
                                <X className="w-6 h-6 stroke-[3]" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-cream/50">
                            {filteredModalAttributes.cards.length === 0 ? (
                                <div className="text-center py-8 text-coffee/40 text-sm font-bold">
                                    {t('stats.modal_no_words')}
                                </div>
                            ) : (
                                filteredModalAttributes.cards.map((card, idx) => {
                                    const masteryPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));
                                    return (
                                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-coffee/10 shadow-sm">
                                            <div className="font-bold text-coffee font-noto-serif-hk text-lg">{card.character}</div>
                                            <div className="text-xs font-bold text-coffee/60">
                                                {t('study.mastery_percent', [masteryPercent])}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Word List */}
            {/* ... */}

            <ConfirmDialog
                isOpen={!!wordToDelete}
                onClose={() => setWordToDelete(null)}
                onConfirm={handleDeleteWord}
                title={t('stats.delete_word_title')}
                message={t('stats.delete_word_message')}
                confirmText={t('common.delete')}
                isDestructive={true}
            />
        </div>
    );
};

