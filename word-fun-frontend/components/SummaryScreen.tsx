import React, { useState } from 'react';
import { FlashcardData } from '../types';
import { TrendingUp, Circle, Trophy, BookOpen, Sparkles, X } from 'lucide-react';

interface SummaryScreenProps {
    cards: FlashcardData[];
    masteryThreshold: number;
}

type FilterTab = 'MASTERED' | 'LEARNING' | 'NEW';

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ cards, masteryThreshold }) => {
    const [activeTab, setActiveTab] = useState<FilterTab>('LEARNING');
    const [languageFilter, setLanguageFilter] = useState<'all' | 'zh' | 'en'>('all');
    const [filteredModalAttributes, setFilteredModalAttributes] = useState<{ title: string, cards: FlashcardData[] } | null>(null);

    // 1. Filter by Language
    const filteredCards = cards.filter(c => {
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

    // Determine displayed list details
    let currentList: FlashcardData[] = [];
    if (activeTab === 'LEARNING') {
        currentList = [...learningCards].sort((a, b) => {
            const accA = (a.correctCount || 0) / (a.revisedCount || 1);
            const accB = (b.correctCount || 0) / (b.revisedCount || 1);
            return accA - accB;
        });
    } else if (activeTab === 'MASTERED') {
        currentList = [...masteredCards].sort((a, b) => (b.revisedCount || 0) - (a.revisedCount || 0));
    } else {
        currentList = newCards;
    }

    return (
        <div className="w-full max-w-lg mx-auto px-4 pb-24 pt-8 font-rounded text-coffee">
            <h1 className="text-2xl font-black text-coffee mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-7 h-7 text-salmon stroke-[3]" />
                    <span className="tracking-tight">Progress</span>
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
                        {lang === 'all' ? 'All' : lang === 'zh' ? 'Chinese' : 'English'}
                    </button>
                ))}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee flex flex-col justify-center items-center text-center">
                    <div className="text-coffee/50 text-[10px] font-black uppercase tracking-widest mb-1">Total Words</div>
                    <div className="text-4xl font-black text-coffee">{totalCards}</div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee flex flex-col justify-center items-center text-center">
                    <div className="text-coffee/50 text-[10px] font-black uppercase tracking-widest mb-1">Mastery</div>
                    <div className="text-4xl font-black text-salmon">{masteryRate}%</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee mb-8">
                <h3 className="text-sm font-black text-coffee mb-4 uppercase tracking-wide opacity-80">Deck Status</h3>

                <div className="flex h-5 rounded-full overflow-hidden bg-coffee/10 mb-5 border-2 border-coffee/10">
                    <div className="bg-matcha transition-all duration-1000 border-r-2 border-white/20" style={{ width: `${totalCards > 0 ? (masteredCards.length / totalCards) * 100 : 0}%` }}></div>
                    <div className="bg-yolk transition-all duration-1000 border-r-2 border-white/20" style={{ width: `${totalCards > 0 ? (learningCards.length / totalCards) * 100 : 0}%` }}></div>
                </div>

                <div className="flex justify-between text-xs font-bold text-coffee/60">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-matcha border border-coffee/20"></div>
                        <span>Mastered ({masteredCards.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-yolk border border-coffee/20"></div>
                        <span>Learning ({learningCards.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-coffee/20"></div>
                        <span>New ({newCards.length})</span>
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <h3 className="text-lg font-black text-coffee mb-4 flex items-center gap-2">
                Recent Activity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Mastered Stats */}
                <div className="bg-white p-4 rounded-3xl border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-matcha/20 text-matcha rounded-lg border border-matcha/30">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-coffee text-sm">Newly Mastered</h4>
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
                                setFilteredModalAttributes({ title: 'Newly Mastered (Last 7 Days)', cards: list });
                            }}
                            className="text-left group cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-salmon transition-colors">Last 7 Days</div>
                            <div className="text-2xl font-black text-coffee group-hover:text-salmon transition-colors">
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
                                setFilteredModalAttributes({ title: 'Newly Mastered (Today)', cards: list });
                            }}
                            className="text-right group cursor-pointer hover:bg-slate-50 p-2 -mr-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-salmon transition-colors">Today</div>
                            <div className="text-2xl font-black text-coffee group-hover:text-salmon transition-colors">
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

                {/* Reviewed Stats */}
                <div className="bg-white p-4 rounded-3xl border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-coffee text-sm">Words Reviewed</h4>
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
                                setFilteredModalAttributes({ title: 'Reviewed (Last 7 Days)', cards: list });
                            }}
                            className="text-left group cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-indigo-500 transition-colors">Last 7 Days</div>
                            <div className="text-2xl font-black text-coffee group-hover:text-indigo-500 transition-colors">
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
                                setFilteredModalAttributes({ title: 'Reviewed (Today)', cards: list });
                            }}
                            className="text-right group cursor-pointer hover:bg-slate-50 p-2 -mr-2 rounded-xl transition-colors"
                        >
                            <div className="text-[10px] text-coffee/40 font-bold uppercase mb-0.5 group-hover:text-indigo-500 transition-colors">Today</div>
                            <div className="text-2xl font-black text-coffee group-hover:text-indigo-500 transition-colors">
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

            {/* Most Difficult (Last 7 Days) */}
            <div className="mb-8">
                <h3 className="text-lg font-black text-coffee mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-salmon rounded-full"></span>
                    Needs Attention
                    <span className="text-[10px] font-bold text-coffee/40 ml-auto bg-white border border-coffee/10 px-2 py-1 rounded-full">Last 7 Days</span>
                </h3>

                {(() => {
                    const recentDifficult = filteredCards
                        .filter(c => {
                            // Must be reviewed recently AND have some errors
                            if (!c.lastReviewedAt) return false;
                            const d = new Date(c.lastReviewedAt);
                            const diffTime = Math.abs(new Date().getTime() - d.getTime());
                            const isRecent = diffTime <= (7 * 24 * 60 * 60 * 1000);
                            const accuracy = (c.correctCount || 0) / (c.revisedCount || 1);

                            return isRecent && accuracy < 0.8 && (c.revisedCount || 0) > 2; // Threshold for "difficult"
                        })
                        .sort((a, b) => {
                            const accA = (a.correctCount || 0) / (a.revisedCount || 1);
                            const accB = (b.correctCount || 0) / (b.revisedCount || 1);
                            return accA - accB;
                        })
                        .slice(0, 5);

                    if (recentDifficult.length === 0) {
                        return (
                            <div className="bg-coffee/5 border-2 border-dashed border-coffee/20 rounded-3xl p-8 text-center text-coffee/40 text-sm font-bold">
                                No difficult words found recently. You're doing great! ✨
                            </div>
                        );
                    }

                    return (
                        <div className="grid grid-cols-1 gap-3">
                            {recentDifficult.map((card, i) => {
                                const masteryPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));
                                return (
                                    <div key={card.id || i} className="bg-white p-3 rounded-2xl border-2 border-coffee/5 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-xl bg-salmon/10 text-salmon border border-salmon/20 flex items-center justify-center text-sm font-black">
                                                {i + 1}
                                            </div>
                                            <div className="text-xl font-bold text-coffee font-noto-serif-hk">{card.character}</div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-black text-salmon">{masteryPercent}% Mastery</div>
                                            <div className="text-[10px] font-bold text-coffee/30">Seen {card.revisedCount} times</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            {/* Filter Tabs - unchanged logic, just layout adjust if needed */}
            <div className="flex p-1.5 bg-coffee/10 rounded-2xl mb-6">
                <button
                    onClick={() => setActiveTab('MASTERED')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'MASTERED'
                        ? 'bg-white text-matcha shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]'
                        : 'text-coffee/50 hover:text-coffee/70'
                        }`}
                >
                    <Trophy className="w-3.5 h-3.5" />
                    Mastered
                </button>
                <button
                    onClick={() => setActiveTab('LEARNING')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'LEARNING'
                        ? 'bg-white text-yolk shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]'
                        : 'text-coffee/50 hover:text-coffee/70'
                        }`}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    Learning
                </button>
                <button
                    onClick={() => setActiveTab('NEW')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'NEW'
                        ? 'bg-white text-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.1)]'
                        : 'text-coffee/50 hover:text-coffee/70'
                        }`}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    New
                </button>
            </div>

            {/* Word List */}
            <h3 className="text-lg font-black text-coffee mb-4 capitalize flex items-center gap-2">
                {activeTab.toLowerCase()} Words
                <span className="text-xs font-bold text-coffee/30 bg-coffee/5 px-2 py-0.5 rounded-full">{currentList.length}</span>
            </h3>

            {currentList.length === 0 ? (
                <div className="text-center py-12 text-coffee/30 bg-coffee/5 rounded-3xl border-2 border-dashed border-coffee/10">
                    <Circle className="w-10 h-10 mx-auto mb-3 opacity-30 stroke-[3]" />
                    <p className="text-sm font-bold">No {activeTab.toLowerCase()} words found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {currentList.map((card, idx) => {
                        // Calculate percentage based on dynamic threshold
                        const progressPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));

                        let colorClass = 'text-coffee/40';
                        if (activeTab !== 'NEW') {
                            if (progressPercent < 50) colorClass = 'text-salmon';
                            else if (progressPercent < 80) colorClass = 'text-yolk';
                            else colorClass = 'text-matcha';
                        }

                        return (
                            <div key={idx} className="bg-white p-4 rounded-2xl border-2 border-coffee/10 shadow-sm flex items-center justify-between group hover:border-coffee/30 hover:shadow-md transition-all">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={`min-w-[3rem] h-12 rounded-xl flex items-center justify-center text-xl font-bold text-coffee font-noto-serif-hk whitespace-nowrap shadow-inner ${activeTab === 'NEW' ? 'bg-coffee/5' : 'bg-cream border-2 border-coffee/10'}`}>
                                        {card.character}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    {activeTab === 'NEW' ? (
                                        <div className="text-[10px] font-black tracking-wider text-coffee/40 bg-coffee/5 px-2 py-1 rounded-lg uppercase">New</div>
                                    ) : (
                                        <>
                                            <div className={`text-sm font-black ${colorClass}`}>{progressPercent}%</div>
                                            <div className="text-[10px] font-bold text-coffee/30 group-hover:text-coffee/50">{card.revisedCount} reviews</div>
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
                            <h3 className="font-black text-coffee text-lg">{filteredModalAttributes.title}</h3>
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
                                    No words found for this period.
                                </div>
                            ) : (
                                filteredModalAttributes.cards.map((card, idx) => {
                                    const masteryPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));
                                    return (
                                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-coffee/10 shadow-sm">
                                            <div className="font-bold text-coffee font-noto-serif-hk text-lg">{card.character}</div>
                                            <div className="text-xs font-bold text-coffee/60">
                                                {masteryPercent}% Mastery
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
