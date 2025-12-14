import React, { useState, useEffect } from 'react';
import { FlashcardData, AppState, AppTab, Profile } from '../types';
import { DEFAULT_CONFIG, STORAGE_KEYS } from '../constants';
import { generateSessionContent } from '../services/geminiService';
import { fetchProfileWords } from '../services/profileService';
import { HomeScreen } from './HomeScreen';
import { Flashcard } from './Flashcard';
import { BottomNav } from './BottomNav';
import { SummaryScreen } from './SummaryScreen';
import { PreferencesScreen } from './PreferencesScreen';
import { ArrowLeft, Check, X, Repeat, Trophy, Home, RotateCcw, Star } from 'lucide-react';

// Helper function for unbiased Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

interface DashboardProps {
    profile: Profile;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onLogout }) => {
    // Internal App State for the Game
    const [appState, setAppState] = useState<AppState>(AppState.LOADING); // Start loading to fetch words
    const [activeTab, setActiveTab] = useState<AppTab>(AppTab.STUDY);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Data State
    const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);

    // Preferences State
    const [autoPlaySound, setAutoPlaySound] = useState(false);
    const [masteryThreshold, setMasteryThreshold] = useState(DEFAULT_CONFIG.MASTERY_THRESHOLD);
    const [learningBatchSize, setLearningBatchSize] = useState(DEFAULT_CONFIG.LEARNING_BATCH_SIZE);
    const [learningPenalty, setLearningPenalty] = useState(DEFAULT_CONFIG.LEARNING_PENALTY);

    // Study Session State
    const [sessionQueue, setSessionQueue] = useState<FlashcardData[]>([]);
    const [missedQueue, setMissedQueue] = useState<FlashcardData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [isRevisionMode, setIsRevisionMode] = useState(false);
    const [revisionRoundCount, setRevisionRoundCount] = useState(0);

    // Initial Setup & Config Loading
    useEffect(() => {
        const savedCards = localStorage.getItem(STORAGE_KEYS.CARDS_CACHE);
        const savedAutoPlay = localStorage.getItem(STORAGE_KEYS.AUTO_PLAY);
        const savedMastery = localStorage.getItem(STORAGE_KEYS.SETTING_MASTERY);
        const savedBatchSize = localStorage.getItem(STORAGE_KEYS.SETTING_BATCH_SIZE);
        const savedPenalty = localStorage.getItem(STORAGE_KEYS.SETTING_PENALTY);

        if (savedCards) {
            try {
                setFlashcards(JSON.parse(savedCards));
            } catch (e) { console.error("Cache parse error"); }
        }

        if (savedAutoPlay !== null) setAutoPlaySound(savedAutoPlay === 'true');
        if (savedMastery) setMasteryThreshold(parseInt(savedMastery));
        if (savedBatchSize) setLearningBatchSize(parseInt(savedBatchSize));
        if (savedPenalty) setLearningPenalty(parseInt(savedPenalty));

        // Load words for the profile immediately
        loadWords(profile.id);
    }, [profile.id]);

    const saveCards = (cards: FlashcardData[]) => {
        setFlashcards(cards);
        localStorage.setItem(STORAGE_KEYS.CARDS_CACHE, JSON.stringify(cards));
    };

    const handleToggleAutoPlay = (enabled: boolean) => {
        setAutoPlaySound(enabled);
        localStorage.setItem(STORAGE_KEYS.AUTO_PLAY, String(enabled));
    };

    const handleUpdateMasteryThreshold = (val: number) => {
        setMasteryThreshold(val);
        localStorage.setItem(STORAGE_KEYS.SETTING_MASTERY, String(val));
    };

    const handleUpdateLearningBatchSize = (val: number) => {
        setLearningBatchSize(val);
        localStorage.setItem(STORAGE_KEYS.SETTING_BATCH_SIZE, String(val));
    };

    const handleUpdateLearningPenalty = (val: number) => {
        setLearningPenalty(val);
        localStorage.setItem(STORAGE_KEYS.SETTING_PENALTY, String(val));
    };

    const loadWords = async (profileId: string) => {
        setAppState(AppState.LOADING);
        try {
            const words = await fetchProfileWords(profileId);
            const mappedWords: FlashcardData[] = words
                .filter((w: any) => w && (w.character || w.text))
                .map((w: any) => ({
                    character: w.character || w.text,
                    pinyin: w.pinyin || '',
                    english: w.english || '',
                    example_cn: w.example_en || '',
                    example_en: '',
                    examples: Array.isArray(w.examples) ? w.examples.map((ex: any) =>
                        typeof ex === 'string' ? { chinese: ex, english: '' } : ex
                    ) : [],
                    revisedCount: w.revisedCount || 0,
                    correctCount: w.correctCount || 0
                }));
            saveCards(mappedWords);
            setAppState(AppState.HOME);
        } catch (err: any) {
            console.error("Failed to load words", err);
            setAppState(AppState.ERROR);
            setErrorMsg("Failed to load vocabulary.");
        }
    };

    const handleRegenerateCard = async (cardToFix: FlashcardData) => {
        try {
            const allWords = flashcards.map(c => c.character);
            const updatedList = await generateSessionContent([cardToFix], allWords);

            if (updatedList.length > 0) {
                const newCard = updatedList[0];
                const updatedFlashcards = flashcards.map(c =>
                    c.character === newCard.character ? newCard : c
                );
                saveCards(updatedFlashcards);
                setSessionQueue(prev => prev.map(c => c.character === newCard.character ? newCard : c));
            }
        } catch (e) {
            console.error("Failed to regenerate card", e);
            alert("Failed to load examples. Please try again.");
        }
    };

    const startStudySession = async () => {
        if (flashcards.length === 0) return;

        const activeCandidates = flashcards.filter(c => (c.correctCount || 0) < masteryThreshold);
        const poolSize = DEFAULT_CONFIG.LEARNING_POOL_SIZE;
        const oldestPool = activeCandidates.slice(0, poolSize);
        const selectedLearning = shuffleArray(oldestPool).slice(0, learningBatchSize);

        const masteredCandidates = flashcards.filter(c => (c.correctCount || 0) >= masteryThreshold);
        const selectedReview: FlashcardData[] = [];

        if (masteredCandidates.length > 0) {
            const getWeight = (correctCount: number) => {
                const diff = correctCount - masteryThreshold;
                const weight = 0.5 - (diff * 0.1);
                return Math.max(0.1, weight);
            };

            const numToPick = Math.min(DEFAULT_CONFIG.REVIEW_BATCH_SIZE, masteredCandidates.length);
            const pool = [...masteredCandidates];

            for (let i = 0; i < numToPick; i++) {
                const weights = pool.map(c => getWeight(c.correctCount || masteryThreshold));
                const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                let random = Math.random() * totalWeight;

                for (let j = 0; j < pool.length; j++) {
                    random -= weights[j];
                    if (random <= 0) {
                        selectedReview.push(pool[j]);
                        pool.splice(j, 1);
                        break;
                    }
                }
            }
        }

        let selection: FlashcardData[] = [...selectedLearning, ...selectedReview];

        if (selection.length === 0) {
            alert("No cards available to study!");
            return;
        }

        const needsGeneration = selection.some(c => !c.examples || c.examples.length === 0);

        if (needsGeneration) {
            setAppState(AppState.LOADING);
            const allWords = flashcards.map(c => c.character);
            const filledSelection = await generateSessionContent(selection, allWords) as FlashcardData[];
            selection = filledSelection;

            const updatedFlashcards: FlashcardData[] = flashcards.map(original => {
                const filled = filledSelection.find(f => f.character === original.character);
                return filled || original;
            });
            saveCards(updatedFlashcards);
        }

        const shuffledSession = shuffleArray(selection);

        setSessionQueue(shuffledSession);
        setMissedQueue([]);
        setCurrentIndex(0);
        setIsRevisionMode(false);
        setIsCardFlipped(false);
        setRevisionRoundCount(0);
        setAppState(AppState.FLASHCARDS);
    };

    const handleGrade = (correct: boolean) => {
        const currentCard = sessionQueue[currentIndex];
        const newRevised = (currentCard.revisedCount || 0) + 1;
        let newCorrect = (currentCard.correctCount || 0);

        if (!isRevisionMode) {
            if (correct) {
                newCorrect = newCorrect + 1;
            } else {
                const isMastered = (currentCard.correctCount || 0) >= masteryThreshold;
                if (isMastered) {
                    newCorrect = Math.floor(masteryThreshold / 2);
                } else {
                    newCorrect = Math.max(0, newCorrect - learningPenalty);
                }
            }
        }

        const updatedCard = { ...currentCard, revisedCount: newRevised, correctCount: newCorrect };
        const updatedFlashcards = flashcards.map(c => c.character === currentCard.character ? updatedCard : c);
        saveCards(updatedFlashcards);

        const nextMissedQueue = correct ? missedQueue : [...missedQueue, updatedCard];
        if (!correct) setMissedQueue(nextMissedQueue);

        if (currentIndex < sessionQueue.length - 1) {
            setIsCardFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        } else {
            handleEndOfQueue(nextMissedQueue);
        }
    };

    const handleEndOfQueue = (finalMissedQueue: FlashcardData[]) => {
        if (finalMissedQueue.length > 0) {
            const shuffledMissed = shuffleArray(finalMissedQueue);
            setSessionQueue(shuffledMissed);
            setMissedQueue([]);
            setCurrentIndex(0);
            setIsRevisionMode(true);
            setRevisionRoundCount(prev => prev + 1);
            setIsCardFlipped(false);
        } else {
            setIsCardFlipped(false);
            setAppState(AppState.COMPLETED);
        }
    };

    const handleFlip = () => setIsCardFlipped(!isCardFlipped);

    const calculateStars = () => {
        if (revisionRoundCount < 2) return 3;
        if (revisionRoundCount < 5) return 2;
        if (revisionRoundCount < 10) return 1;
        return 0;
    };

    return (
        <div className="h-[100dvh] w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
            {appState === AppState.FLASHCARDS && (
                <header className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center shrink-0 h-14">
                    <button onClick={() => setAppState(AppState.HOME)} className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium text-sm transition-colors">
                        <ArrowLeft className="w-5 h-5" /> Exit
                    </button>
                    {isRevisionMode ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                            <Repeat className="w-3 h-3" /> Revision {revisionRoundCount}
                        </div>
                    ) : (
                        <div className="font-bold text-slate-800">
                            Card {currentIndex + 1} <span className="text-slate-400 text-sm font-normal">/ {sessionQueue.length}</span>
                        </div>
                    )}
                    <div className="w-10"></div>
                </header>
            )}

            <main className="flex-1 flex flex-col w-full max-w-screen-xl mx-auto relative min-h-0 overflow-hidden">
                {appState === AppState.LOADING && (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white/80 backdrop-blur-sm absolute inset-0 z-50">
                        <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-6"></div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Processing...</h2>
                        <p className="text-slate-500">Preparing your study session</p>
                    </div>
                )}

                {appState === AppState.ERROR && (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-md mx-auto">
                        <div className="bg-red-100 p-4 rounded-full mb-4"><RotateCcw className="w-8 h-8 text-red-600" /></div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Failed</h2>
                        <p className="text-slate-500 mb-6">{errorMsg}</p>
                        <button onClick={() => setAppState(AppState.HOME)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors">Retry</button>
                    </div>
                )}

                {appState === AppState.COMPLETED && (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                        <div className="relative mb-8">
                            <div className="absolute -inset-4 bg-yellow-200 rounded-full blur-lg opacity-50 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-full shadow-xl text-white transform rotate-3">
                                <Trophy className="w-16 h-16" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">Congratulations!</h2>
                        <p className="text-slate-500 mb-6 text-lg">Session Complete</p>
                        <div className="flex items-center justify-center gap-2 mb-8">
                            {[...Array(3)].map((_, i) => {
                                const starsEarned = calculateStars();
                                const isFilled = i < starsEarned;
                                return (
                                    <div key={i} className={`transform transition-all duration-500 ${isFilled ? 'scale-110' : 'scale-100 opacity-30'}`}>
                                        <Star className={`w-12 h-12 ${isFilled ? 'fill-yellow-400 text-yellow-500' : 'fill-slate-200 text-slate-300'}`} />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mb-10 uppercase tracking-wide">
                            {revisionRoundCount === 0 ? "Perfect Run!" : `${revisionRoundCount} Revision Round${revisionRoundCount !== 1 ? 's' : ''}`}
                        </div>
                        <button onClick={() => setAppState(AppState.HOME)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-300 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            <Home className="w-5 h-5" /> Back to Home
                        </button>
                    </div>
                )}

                {(appState === AppState.HOME || appState === AppState.MANAGE) && (
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === AppTab.STUDY && (
                            <HomeScreen cardCount={flashcards.length} onStart={startStudySession} onManage={() => { }} />
                        )}
                        {activeTab === AppTab.STATS && (
                            <SummaryScreen cards={flashcards} masteryThreshold={masteryThreshold} />
                        )}
                        {activeTab === AppTab.SETTINGS && (
                            <PreferencesScreen
                                autoPlaySound={autoPlaySound}
                                onToggleAutoPlaySound={handleToggleAutoPlay}
                                masteryThreshold={masteryThreshold}
                                onUpdateMasteryThreshold={handleUpdateMasteryThreshold}
                                learningBatchSize={learningBatchSize}
                                onUpdateLearningBatchSize={handleUpdateLearningBatchSize}
                                learningPenalty={learningPenalty}
                                onUpdateLearningPenalty={handleUpdateLearningPenalty}
                                onLogout={onLogout}
                            />
                        )}
                        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
                    </div>
                )}

                {appState === AppState.FLASHCARDS && sessionQueue.length > 0 && (
                    <div className="w-full h-full flex flex-col items-center pb-safe px-4">
                        <div className="w-full max-w-xs bg-slate-200 h-1 rounded-full overflow-hidden shrink-0 mt-6 mb-4">
                            <div className={`h-full transition-all duration-300 ${isRevisionMode ? 'bg-orange-400' : 'bg-rose-500'}`} style={{ width: `${((currentIndex + 1) / sessionQueue.length) * 100}%` }}></div>
                        </div>
                        <div className="flex-1 w-full flex items-center justify-center min-h-0 py-2">
                            <Flashcard
                                data={sessionQueue[currentIndex]}
                                isFlipped={isCardFlipped}
                                onFlip={handleFlip}
                                autoPlaySound={autoPlaySound}
                                onRegenerate={() => handleRegenerateCard(sessionQueue[currentIndex])}
                                masteryThreshold={masteryThreshold}
                            />
                        </div>
                        <div className="w-full max-w-md shrink-0 py-4 flex items-center justify-center gap-3 h-24">
                            {!isCardFlipped ? (
                                <button onClick={handleFlip} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-xl hover:bg-slate-800 transition-all">Reveal</button>
                            ) : (
                                <>
                                    <button onClick={() => handleGrade(false)} className="flex-1 py-4 rounded-2xl bg-white border-2 border-rose-100 text-rose-500 font-bold shadow-lg hover:bg-rose-50 transition-all flex items-center justify-center gap-2"><X className="w-6 h-6" /> Forgot</button>
                                    <button onClick={() => handleGrade(true)} className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-bold shadow-lg shadow-green-200 hover:bg-green-600 transition-all flex items-center justify-center gap-2"><Check className="w-6 h-6" /> Got it</button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
