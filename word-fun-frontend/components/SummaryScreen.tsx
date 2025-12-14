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
        <div className="w-full max-w-lg mx-auto px-4 pb-24 pt-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-rose-600" />
                    <span>Progress</span>
                </div>
            </h1>

            {/* Language Toggle */}
            <div className="flex p-1 bg-slate-200/50 rounded-xl mb-6">
                {(['all', 'zh', 'en'] as const).map(lang => (
                    <button
                        key={lang}
                        onClick={() => setLanguageFilter(lang)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${languageFilter === lang
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {lang === 'all' ? 'All' : lang === 'zh' ? 'Chinese' : 'English'}
                    </button>
                ))}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Words</div>
                    <div className="text-3xl font-black text-slate-800">{totalCards}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Mastery</div>
                    <div className="text-3xl font-black text-rose-500">{masteryRate}%</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Deck Status</h3>

                <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 mb-4">
                    <div className="bg-green-500 transition-all duration-1000" style={{ width: `${totalCards > 0 ? (masteredCards.length / totalCards) * 100 : 0}%` }}></div>
                    <div className="bg-orange-400 transition-all duration-1000" style={{ width: `${totalCards > 0 ? (learningCards.length / totalCards) * 100 : 0}%` }}></div>
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Mastered ({masteredCards.length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        <span>Learning ({learningCards.length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                        <span>New ({newCards.length})</span>
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Mastered Stats */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-700 text-sm">Newly Mastered</h4>
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
                            className="text-left group cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-lg transition-colors"
                        >
                            <div className="text-xs text-slate-400 font-medium uppercase mb-0.5 group-hover:text-rose-500 transition-colors">Last 7 Days</div>
                            <div className="text-2xl font-black text-slate-800 group-hover:text-rose-600 transition-colors">
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
                            className="text-right group cursor-pointer hover:bg-slate-50 p-2 -mr-2 rounded-lg transition-colors"
                        >
                            <div className="text-xs text-slate-400 font-medium uppercase mb-0.5 group-hover:text-rose-500 transition-colors">Today</div>
                            <div className="text-2xl font-black text-slate-800 group-hover:text-rose-600 transition-colors">
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
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-700 text-sm">Words Reviewed</h4>
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
                            className="text-left group cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-lg transition-colors"
                        >
                            <div className="text-xs text-slate-400 font-medium uppercase mb-0.5 group-hover:text-blue-500 transition-colors">Last 7 Days</div>
                            <div className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
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
                            className="text-right group cursor-pointer hover:bg-slate-50 p-2 -mr-2 rounded-lg transition-colors"
                        >
                            <div className="text-xs text-slate-400 font-medium uppercase mb-0.5 group-hover:text-blue-500 transition-colors">Today</div>
                            <div className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
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
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-red-500 rounded-full"></span>
                    Needs Attention
                    <span className="text-xs font-normal text-slate-400 ml-auto bg-slate-100 px-2 py-1 rounded">Last 7 Days Activity</span>
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
                            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                                No difficult words found in recent activity. Great job!
                            </div>
                        );
                    }

                    return (
                        <div className="grid grid-cols-1 gap-3">
                            {recentDifficult.map((card, i) => {
                                const masteryPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));
                                return (
                                    <div key={card.id || i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            <div className="text-lg font-bold text-slate-700">{card.character}</div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-bold text-red-500">{masteryPercent}% Mastery</div>
                                            <div className="text-[10px] text-slate-400">Seen {card.revisedCount} times</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            {/* Filter Tabs - unchanged logic, just layout adjust if needed */}
            <div className="flex p-1 bg-slate-200/50 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('MASTERED')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'MASTERED'
                        ? 'bg-white text-green-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Trophy className="w-3.5 h-3.5" />
                    Mastered
                </button>
                <button
                    onClick={() => setActiveTab('LEARNING')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'LEARNING'
                        ? 'bg-white text-orange-500 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    Learning
                </button>
                <button
                    onClick={() => setActiveTab('NEW')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'NEW'
                        ? 'bg-white text-slate-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    New
                </button>
            </div>

            {/* Word List */}
            <h3 className="text-lg font-bold text-slate-800 mb-4 capitalize">{activeTab.toLowerCase()} Words</h3>

            {currentList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Circle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No {activeTab.toLowerCase()} words found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {currentList.map((card, idx) => {
                        // Calculate percentage based on dynamic threshold
                        const progressPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));

                        let colorClass = 'text-slate-400';
                        if (activeTab !== 'NEW') {
                            if (progressPercent < 50) colorClass = 'text-red-500';
                            else if (progressPercent < 80) colorClass = 'text-orange-500';
                            else colorClass = 'text-green-500';
                        }

                        return (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={`min-w-[2.5rem] h-10 px-2 rounded-full flex items-center justify-center text-lg font-bold text-slate-700 font-noto-serif-hk whitespace-nowrap ${activeTab === 'NEW' ? 'bg-slate-100' : 'bg-slate-50 border border-slate-100'}`}>
                                        {card.character}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    {activeTab === 'NEW' ? (
                                        <div className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">New</div>
                                    ) : (
                                        <>
                                            <div className={`text-sm font-bold ${colorClass}`}>{progressPercent}%</div>
                                            <div className="text-[10px] text-slate-400">{card.revisedCount} reviews</div>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">{filteredModalAttributes.title}</h3>
                            <button
                                onClick={() => setFilteredModalAttributes(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredModalAttributes.cards.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No words found for this period.
                                </div>
                            ) : (
                                filteredModalAttributes.cards.map((card, idx) => {
                                    const masteryPercent = Math.min(100, Math.round(((card.correctCount || 0) / masteryThreshold) * 100));
                                    return (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                            <div className="font-bold text-slate-700">{card.character}</div>
                                            <div className="text-xs font-bold text-slate-500">
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