import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { FlashcardData, User, Profile } from './types';
import { DEFAULT_CONFIG, STORAGE_KEYS } from './constants';
import { jwtDecode } from 'jwt-decode';
import {
    generateSessionContent,
    generateSingleExample
} from './services/geminiService';
import { loginWithGoogle } from './services/authService';
import { fetchProfileWords, updateWord, syncAndGetProfiles, createProfile } from './services/profileService';
import { HomeScreen } from './components/HomeScreen';
import { Flashcard } from './components/Flashcard';
import { SignInPage } from './components/SignInPage';
import { ProfileSelectionPage } from './components/ProfileSelectionPage';
import { ProfileGuard } from './components/ProfileGuard';
import { AddWordsScreen } from './components/AddWordsScreen';
import { BottomNav } from './components/BottomNav';
import { SummaryScreen } from './components/SummaryScreen';
import { PreferencesScreen } from './components/PreferencesScreen';
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

const App: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Global App State
    const [user, setUser] = useState<User | null>(null);
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]); // Hoisted profiles state
    const [isProfilesLoading, setIsProfilesLoading] = useState(false); // New state for profile loading
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true); // New initialization state
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSessionCompleted, setIsSessionCompleted] = useState(false);

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

    // Stats Tracking for Session
    const [revisionRoundCount, setRevisionRoundCount] = useState(0);
    const [pendingScore, setPendingScore] = useState<boolean | null>(null);

    // Calculate stars based on performance
    const calculateStars = () => {
        if (revisionRoundCount < 2) return 3;
        if (revisionRoundCount < 5) return 2;
        if (revisionRoundCount < 10) return 1;
        return 0;
    };

    const loadAllProfiles = async () => {
        setIsProfilesLoading(true);
        try {
            const data = await syncAndGetProfiles();
            setProfiles(data.profiles);
        } catch (e) {
            console.error("Failed to load profiles", e);
        } finally {
            setIsProfilesLoading(false);
        }
    };

    const saveCards = (cards: FlashcardData[]) => {
        setFlashcards(cards);
        localStorage.setItem(STORAGE_KEYS.CARDS_CACHE, JSON.stringify(cards));
    };

    const loadWords = async (profileId: string, showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const words = await fetchProfileWords(profileId);
            const mappedWords: FlashcardData[] = words
                .filter((w: any) => w && (w.character || w.text))
                .map((w: any) => ({
                    id: w.id, // Map ID for progress updates
                    character: w.character || w.text,
                    pinyin: w.pinyin || '',
                    english: w.english || '',
                    example_cn: w.example_en || '',
                    example_en: '',
                    examples: Array.isArray(w.examples) ? w.examples.map((ex: any) =>
                        typeof ex === 'string' ? { chinese: ex, english: '' } : ex
                    ) : [],
                    revisedCount: w.revisedCount || 0,
                    correctCount: w.correctCount || 0,
                    language: w.language || 'zh',
                    lastReviewedAt: w.lastReviewedAt ? new Date(w.lastReviewedAt) : undefined,
                    masteredAt: w.masteredAt ? new Date(w.masteredAt) : undefined
                }));
            saveCards(mappedWords);
            if (showLoading) setIsLoading(false);
        } catch (err: any) {
            console.error("Failed to load words", err);
            if (showLoading) setIsLoading(false);
            setErrorMsg("Failed to load vocabulary.");
        }
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

    useEffect(() => {
        const loadSession = async () => {
            const savedCards = localStorage.getItem(STORAGE_KEYS.CARDS_CACHE);
            const savedAutoPlay = localStorage.getItem(STORAGE_KEYS.AUTO_PLAY);

            const savedMastery = localStorage.getItem(STORAGE_KEYS.SETTING_MASTERY);
            const savedBatchSize = localStorage.getItem(STORAGE_KEYS.SETTING_BATCH_SIZE);
            const savedPenalty = localStorage.getItem(STORAGE_KEYS.SETTING_PENALTY);

            // Check for user session
            const savedUser = localStorage.getItem('word_fun_user');
            const savedProfile = localStorage.getItem('word_fun_profile');

            try {
                if (savedUser) {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    await loadAllProfiles();

                    if (savedProfile) {
                        const parsedProfile = JSON.parse(savedProfile);
                        setCurrentProfile(parsedProfile);
                        // Trigger background refresh of words
                        loadWords(parsedProfile.id, false);

                        if (location.pathname === '/') {
                            navigate(`/profiles/${parsedProfile.id}/study`);
                        }
                    } else {
                        if (location.pathname === '/') {
                            navigate('/profiles');
                        }
                    }
                } else {
                    if (location.pathname !== '/login') {
                        navigate('/login');
                    }
                }
            } catch (e) {
                console.error("Failed to restore user session");
            }

            // Load cache regardless (for smooth UI), but it will be updated by loadWords above
            let initialCards: FlashcardData[] = [];
            if (savedCards) {
                try {
                    initialCards = JSON.parse(savedCards) as FlashcardData[];
                    // Re-hydrate Date objects from JSON strings
                    initialCards = initialCards.map(c => ({
                        ...c,
                        lastReviewedAt: c.lastReviewedAt ? new Date(c.lastReviewedAt) : undefined,
                        masteredAt: c.masteredAt ? new Date(c.masteredAt) : undefined
                    }));
                    setFlashcards(initialCards);
                } catch (e) {
                    console.error("Failed to parse cached cards");
                }
            }

            if (savedAutoPlay !== null) setAutoPlaySound(savedAutoPlay === 'true');
            if (savedMastery) setMasteryThreshold(parseInt(savedMastery));
            if (savedBatchSize) setLearningBatchSize(parseInt(savedBatchSize));
            if (savedPenalty) setLearningPenalty(parseInt(savedPenalty));

            setIsInitializing(false);
        };

        loadSession();
    }, []);

    // Refresh profiles when visiting the selection screen to update stats
    useEffect(() => {
        if (user && location.pathname === '/profiles') {
            loadAllProfiles();
        }
    }, [location.pathname, user]);



    const handleRegenerateCard = async (cardToFix: FlashcardData) => {
        try {
            const allWords = flashcards.map(c => c.character);
            if (!currentProfile?.id) return;
            const updatedList = await generateSessionContent(currentProfile.id, [cardToFix], allWords);

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

    const handleRegenerateSingleExample = async (index: number) => {
        const currentCard = sessionQueue[currentIndex];
        // Ensure examples array exists
        const currentExamples = currentCard.examples || [];
        // Map to string array for context
        const contextExamples = currentExamples.map(ex => ex.chinese);

        try {
            // Generate NEW example
            if (!currentProfile?.id) return;
            const newChinese = await generateSingleExample(currentProfile.id, currentCard.character, contextExamples);

            // Update the specific example at 'index'
            const nextExamples = [...currentExamples];
            if (!nextExamples[index]) {
                // If somehow index is out of bounds or missing, push it
                nextExamples.push({ chinese: newChinese, english: '' });
            } else {
                nextExamples[index] = { ...nextExamples[index], chinese: newChinese };
            }

            // Construct updated card
            const updatedCard: FlashcardData = {
                ...currentCard,
                examples: nextExamples
            };

            // 1. Update persisted Flashcards
            const updatedFlashcards = flashcards.map(c =>
                c.character === currentCard.character ? updatedCard : c
            );
            saveCards(updatedFlashcards);

            // 2. Update current Session Queue
            setSessionQueue(prev => prev.map(c => c.character === currentCard.character ? updatedCard : c));

            // 3. Sync to Backend
            if (currentProfile && currentProfile.id && currentCard.id) {
                updateWord(currentProfile.id, currentCard.id, { examples: nextExamples })
                    .then(() => console.log(`Example regenerated for ${currentCard.character}`))
                    .catch(err => console.error("Failed to sync new example", err));
            }

        } catch (e) {
            console.error("Failed to regenerate single example", e);
            // Optional: Show toast or error
        }
    };

    const startStudySession = async (lang: 'zh' | 'en' | 'all') => {
        let pool = flashcards;

        if (lang !== 'all') {
            pool = flashcards.filter(c => c.language === lang || (!c.language && lang === 'zh')); // Default old cards to zh if undefined
        }

        if (pool.length === 0) {
            alert(`No ${lang === 'zh' ? 'Chinese' : lang === 'en' ? 'English' : ''} cards available! Add some words first.`);
            return;
        }

        // --- STEP 1: Learning Pool (Active Words) ---
        const activeCandidates = pool.filter(c => (c.correctCount || 0) < masteryThreshold);

        // Pick from fixed pool size of 30 oldest words
        const poolSize = DEFAULT_CONFIG.LEARNING_POOL_SIZE;
        const oldestPool = activeCandidates.slice(0, poolSize);

        // Randomly pick Batch Size from this pool
        const selectedLearning = shuffleArray(oldestPool).slice(0, learningBatchSize);

        // --- STEP 2: Review Pool (Mastered Words) ---
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

        // --- STEP 3: Combine ---
        let selection: FlashcardData[] = [...selectedLearning, ...selectedReview];

        if (selection.length === 0) {
            alert("No cards available to study!");
            return;
        }

        console.log(`[SESSION] Selected ${selection.length} total cards: ${selectedLearning.length} Learning + ${selectedReview.length} Review`);

        // --- STEP 4: CHECK FOR UPDATES AND LAZY GENERATION ---
        let needsGeneration = selection.some(c => !c.examples || c.examples.length === 0);

        // Pre-check: If missing content, try fetching from backend first (in case AI finished in background)
        if (needsGeneration && currentProfile?.id) {
            try {
                console.log("[SESSION] Missing examples detected. Checking backend for updates...");
                const freshWords = await fetchProfileWords(currentProfile.id);

                // Update selection with fresh data
                selection = selection.map(sel => {
                    const fresh = freshWords.find((w: any) => w.id === sel.id);
                    if (fresh && fresh.examples && fresh.examples.length > 0) {
                        const mappedExamples = Array.isArray(fresh.examples) ? fresh.examples.map((ex: any) =>
                            typeof ex === 'string' ? { chinese: ex, english: '' } : ex
                        ) : [];
                        console.log(`[SESSION] Found updated examples for ${sel.character}`);
                        return { ...sel, examples: mappedExamples };
                    }
                    return sel;
                });

                // Also update global state silently to keep it fresh
                loadWords(currentProfile.id, false);

                // Re-evaluate need for AI
                needsGeneration = selection.some(c => !c.examples || c.examples.length === 0);

            } catch (e) {
                console.error("Failed to quick-fetch updates", e);
            }
        }

        if (needsGeneration) {
            setIsLoading(true);
            console.log("[PERF] Session content generation needed. Starting...");
            const genStart = performance.now();

            const allWords = flashcards.map(c => c.character);
            if (!currentProfile?.id) {
                setIsLoading(false);
                return;
            }
            const filledSelection = await generateSessionContent(currentProfile.id, selection, allWords) as FlashcardData[];

            const genEnd = performance.now();
            console.log(`[PERF] Session Generation Wait Time: ${(genEnd - genStart).toFixed(0)}ms`);

            selection = filledSelection;

            const updatedFlashcards: FlashcardData[] = flashcards.map(original => {
                const filled = filledSelection.find(f => f.character === original.character);
                return filled || original;
            });
            saveCards(updatedFlashcards);

            // SYNC NEW EXAMPLES TO BACKEND
            if (currentProfile && currentProfile.id) {
                filledSelection.forEach(card => {
                    // Only sync if it was ACTUALLY generated (examples length > 0)
                    // and if it wasn't already there (we checked backend above, so if we are here, it's new)
                    if (card.id && card.examples && card.examples.length > 0) {
                        updateWord(currentProfile.id, card.id, { examples: card.examples })
                            .catch(err => console.error(`Failed to sync examples for ${card.character}`, err));
                    }
                });
            }

            setIsLoading(false);
        }

        // --- STEP 5: Final Shuffle ---
        const shuffledSession = shuffleArray(selection);

        setSessionQueue(shuffledSession);
        setMissedQueue([]);
        setCurrentIndex(0);
        setIsRevisionMode(false);
        setIsCardFlipped(false);
        setPendingScore(null);
        setRevisionRoundCount(0);
        setIsSessionCompleted(false);

        if (currentProfile) {
            navigate(`/profiles/${currentProfile.id}/session`);
        }
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

        const now = new Date();
        let masteredAt = currentCard.masteredAt;

        // Check for new mastery
        if ((currentCard.correctCount || 0) < masteryThreshold && newCorrect >= masteryThreshold) {
            masteredAt = now;
        }

        // Sync to backend if we have profile and word ID
        if (currentProfile && currentProfile.id && currentCard.id) {
            updateWord(currentProfile.id, currentCard.id, {
                revisedCount: newRevised,
                correctCount: newCorrect,
                lastReviewedAt: now,
                masteredAt: masteredAt
            })
                .then(() => console.log(`Stats updated for ${currentCard.character}`))
                .catch(err => console.error("Failed to sync stats", err));
        }

        const updatedCard = {
            ...currentCard,
            revisedCount: newRevised,
            correctCount: newCorrect,
            lastReviewedAt: now,
            masteredAt: masteredAt
        };

        const updatedFlashcards = flashcards.map(c =>
            c.character === currentCard.character ? updatedCard : c
        );

        saveCards(updatedFlashcards);


        const nextMissedQueue = correct ? missedQueue : [...missedQueue, updatedCard];

        if (!correct) {
            setMissedQueue(nextMissedQueue);
        }

        if (currentIndex < sessionQueue.length - 1) {
            setIsCardFlipped(false);
            setPendingScore(null);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        } else {
            handleEndOfQueue(nextMissedQueue);
        }
    };

    const handleRate = (correct: boolean) => {
        setPendingScore(correct);
        if (!isCardFlipped) {
            setIsCardFlipped(true);
        }
    };

    const handleNextCard = () => {
        if (pendingScore === null) return;
        handleGrade(pendingScore);
        setPendingScore(null);
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
            setIsSessionCompleted(true);
        }
    };

    const handleFlip = () => {
        setIsCardFlipped(!isCardFlipped);
    };

    const handleLoginSuccess = async (googleResponse: any) => {
        try {
            console.log("Google Login Response:", googleResponse);
            if (!googleResponse.credential) {
                throw new Error("No credential received from Google");
            }

            // 1. Verify with backend (Exchange specific logic)
            // Note: loginWithGoogle calls the backend /login endpoint
            const authData = await loginWithGoogle(googleResponse.credential);

            // 2. Decode the Google ID Token to getting profile info (Picture, Name)
            // We use the ID Token for display info because our backend auth response might be minimal
            const decoded: any = jwtDecode(googleResponse.credential);

            const userProfile: User = {
                email: decoded.email,
                name: decoded.name,
                picture: decoded.picture
            };

            console.log("User successfully logged in:", userProfile);

            // 3. Persist Session
            setUser(userProfile);
            localStorage.setItem('word_fun_user', JSON.stringify(userProfile));

            if (authData.token) {
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
            }
            if (authData.refresh_token) {
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.refresh_token);
            }

            // 4. Load Profiles immediately to ensure fresh state
            console.log("Loading profiles for new session...");
            await loadAllProfiles();

            // 5. Navigate
            navigate('/profiles');

        } catch (e: any) {
            console.error("Login processing failed:", e);
            alert(`Login failed: ${e.message || "Unknown error"}`);
        }
    };

    const handleLoginError = () => {
        alert("Login failed. Please try again.");
    };

    const handleLogout = () => {
        setUser(null);
        setCurrentProfile(null);
        localStorage.removeItem('word_fun_user');
        localStorage.removeItem('word_fun_profile'); // Clear profile
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        navigate('/login');
    };

    const handleProfileSelect = (profile: Profile) => {
        // User Action: Simply navigate. The ProfileGuard will handle data loading.
        navigate(`/profiles/${profile.id}/study`);
    };

    const handleProfileSync = (profile: Profile) => {
        // Guard Action: Sync state and load data
        console.log("Syncing Profile:", profile);
        setCurrentProfile(profile);
        localStorage.setItem('word_fun_profile', JSON.stringify(profile)); // Persist profile
        loadWords(profile.id);
    };

    // Render Logic for Session to keep Routes clean
    const renderSession = () => {
        if (isSessionCompleted) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                    <div className="relative mb-8">
                        <div className="absolute -inset-4 bg-yellow-200 rounded-full blur-lg opacity-50 animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-full shadow-xl text-white transform rotate-3">
                            <Trophy className="w-16 h-16" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-slate-800 mb-2">Congratulations!</h2>
                    <p className="text-slate-500 mb-6 text-lg">
                        Session Complete
                    </p>

                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[...Array(3)].map((_, i) => {
                            const starsEarned = calculateStars();
                            const isFilled = i < starsEarned;
                            return (
                                <div
                                    key={i}
                                    className={`transform transition-all duration-500 ${isFilled ? 'scale-110' : 'scale-100 opacity-30'}`}
                                    style={{
                                        transitionDelay: `${i * 200}ms`,
                                        animation: isFilled ? `bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${i * 200}ms forwards` : 'none'
                                    }}
                                >
                                    <Star
                                        className={`w-12 h-12 ${isFilled ? 'fill-yellow-400 text-yellow-500' : 'fill-slate-200 text-slate-300'}`}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-xs text-slate-400 font-medium mb-10 uppercase tracking-wide">
                        {revisionRoundCount === 0 ? "Perfect Run!" : `${revisionRoundCount} Revision Round${revisionRoundCount !== 1 ? 's' : ''}`}
                    </div>

                    <button
                        onClick={() => navigate(currentProfile ? `/profiles/${currentProfile.id}/study` : '/profiles')}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-300 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                    >
                        <Home className="w-5 h-5" />
                        Back to Home
                    </button>

                    <style>{`
                         @keyframes bounce {
                             0% { transform: scale(0); opacity: 0; }
                             50% { transform: scale(1.5); opacity: 1; }
                             100% { transform: scale(1); opacity: 1; }
                         }
                     `}</style>
                </div>
            )
        }

        return (
            <>
                <header className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center shrink-0 h-14">
                    <button
                        onClick={() => navigate(currentProfile ? `/profiles/${currentProfile.id}/study` : '/profiles')}
                        className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium text-sm transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Exit
                    </button>

                    {isRevisionMode ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                            <Repeat className="w-3 h-3" />
                            Revision {revisionRoundCount}
                        </div>
                    ) : (
                        <div className="font-bold text-slate-800">
                            Card {currentIndex + 1} <span className="text-slate-400 text-sm font-normal">/ {sessionQueue.length}</span>
                        </div>
                    )}

                    <div className="w-10"></div>
                </header>

                {sessionQueue.length > 0 && (
                    <div className="w-full h-full flex flex-col items-center pb-safe px-4">
                        <div className="w-full max-w-xs bg-slate-200 h-1 rounded-full overflow-hidden shrink-0 mt-6 mb-4">
                            <div
                                className={`h-full transition-all duration-300 ${isRevisionMode ? 'bg-orange-400' : 'bg-rose-500'}`}
                                style={{ width: `${((currentIndex + 1) / sessionQueue.length) * 100}%` }}
                            ></div>
                        </div>

                        <div className="flex-1 w-full flex items-center justify-center min-h-0 py-2">
                            <Flashcard
                                data={sessionQueue[currentIndex]}
                                isFlipped={isCardFlipped}
                                onFlip={handleFlip}
                                autoPlaySound={autoPlaySound}
                                onRegenerate={() => handleRegenerateCard(sessionQueue[currentIndex])}
                                onRegenerateExample={handleRegenerateSingleExample}
                                masteryThreshold={masteryThreshold}
                            />
                        </div>

                        <div className="w-full max-w-md shrink-0 py-4 flex items-center justify-center gap-3 h-24">
                            {!isCardFlipped ? (
                                <>
                                    <button
                                        onClick={() => handleRate(false)}
                                        className={`flex-1 py-4 rounded-2xl border-2 font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${pendingScore === false ? 'bg-rose-100 border-rose-500 text-rose-600 ring-2 ring-rose-300' : 'bg-white border-rose-100 text-rose-500 hover:bg-rose-50'}`}
                                    >
                                        <X className="w-6 h-6" />
                                        Forgot
                                    </button>

                                    <button
                                        onClick={() => handleRate(true)}
                                        className={`flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${pendingScore === true ? 'bg-green-600 text-white ring-4 ring-green-200 shadow-green-900/20' : 'bg-green-500 text-white shadow-green-200 hover:bg-green-600'}`}
                                    >
                                        <Check className="w-6 h-6" />
                                        Got it
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleFlip}
                                        className="flex-1 py-4 rounded-2xl bg-white text-slate-700 font-bold border-2 border-slate-200 shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        Flip Back
                                    </button>
                                    <button
                                        onClick={handleNextCard}
                                        className="flex-[2] py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        Next Card <ArrowLeft className="w-5 h-5 rotate-180" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </>
        )
    };

    if (isInitializing) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
            {/* ... Global States ... */}

            <main className="flex-1 flex flex-col w-full max-w-screen-xl mx-auto relative min-h-0 overflow-hidden">
                <Routes>
                    <Route
                        path="/login"
                        element={
                            !user ? (
                                <SignInPage
                                    onLoginSuccess={handleLoginSuccess}
                                    onLoginError={handleLoginError}
                                />
                            ) : (
                                <Navigate to="/profiles" replace />
                            )
                        }
                    />

                    <Route
                        path="/profiles"
                        element={
                            user ? (
                                <ProfileSelectionPage
                                    onProfileSelect={handleProfileSelect}
                                    onLogout={handleLogout}
                                    profiles={profiles}
                                    onProfilesChange={loadAllProfiles}
                                    isLoading={isProfilesLoading}
                                    user={user}
                                />
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    />

                    {/* DYNAMIC PROFILE ROUTES */}
                    <Route
                        path="/profiles/:profileId/study"
                        element={
                            user ? (
                                <ProfileGuard
                                    profiles={profiles}
                                    isLoading={isLoading || isInitializing || isProfilesLoading}
                                    currentProfile={currentProfile}
                                    onProfileSwitch={handleProfileSync}
                                >
                                    <div className="flex-1 overflow-y-auto">
                                        <HomeScreen
                                            cardCountZh={flashcards.filter(c => c.language === 'zh' || !c.language).length}
                                            cardCountEn={flashcards.filter(c => c.language === 'en').length}
                                            onStart={startStudySession}
                                            onManage={() => navigate(`/profiles/${currentProfile?.id}/add`)}
                                            isSyncing={isLoading}
                                            onSync={() => loadWords(currentProfile!.id)}
                                            profileName={currentProfile?.displayName}
                                            avatarId={currentProfile?.avatarId}
                                            masteredCount={flashcards.filter(c => (c.correctCount || 0) >= masteryThreshold).length}
                                            reviewedCount={flashcards.reduce((acc, curr) => acc + (curr.revisedCount || 0), 0)}
                                        />
                                    </div>
                                    <BottomNav
                                        profileName={currentProfile?.displayName}
                                        profiles={profiles}
                                        currentProfileId={currentProfile?.id}
                                        onProfileSelect={handleProfileSelect}
                                    />
                                </ProfileGuard>
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    />

                    <Route
                        path="/profiles/:profileId/stats"
                        element={
                            user ? (
                                <ProfileGuard
                                    profiles={profiles}
                                    isLoading={isLoading || isInitializing || isProfilesLoading}
                                    currentProfile={currentProfile}
                                    onProfileSwitch={handleProfileSync}
                                >
                                    <div className="flex-1 overflow-y-auto">
                                        <SummaryScreen cards={flashcards} masteryThreshold={masteryThreshold} />
                                    </div>
                                    <BottomNav
                                        profileName={currentProfile?.displayName}
                                        profiles={profiles}
                                        currentProfileId={currentProfile?.id}
                                        onProfileSelect={handleProfileSelect}
                                    />
                                </ProfileGuard>
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    />

                    <Route
                        path="/profiles/:profileId/add"
                        element={
                            user ? (
                                <ProfileGuard
                                    profiles={profiles}
                                    isLoading={isLoading || isInitializing || isProfilesLoading}
                                    currentProfile={currentProfile}
                                    onProfileSwitch={handleProfileSync}
                                >
                                    <div className="flex-1 overflow-hidden h-screen pb-20">
                                        <AddWordsScreen
                                            profileId={currentProfile?.id || ''}
                                            onBack={() => { }}
                                            onWordsAdded={() => loadWords(currentProfile?.id || '', false)}
                                        />
                                    </div>
                                    <BottomNav
                                        profileName={currentProfile?.displayName}
                                        profiles={profiles}
                                        currentProfileId={currentProfile?.id}
                                        onProfileSelect={handleProfileSelect}
                                    />
                                </ProfileGuard>
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    />

                    <Route
                        path="/profiles/:profileId/settings"
                        element={
                            user ? (
                                <ProfileGuard
                                    profiles={profiles}
                                    isLoading={isLoading || isInitializing || isProfilesLoading}
                                    currentProfile={currentProfile}
                                    onProfileSwitch={handleProfileSync}
                                >
                                    <div className="flex-1 overflow-y-auto">
                                        <PreferencesScreen
                                            autoPlaySound={autoPlaySound}
                                            onToggleAutoPlaySound={handleToggleAutoPlay}
                                            masteryThreshold={masteryThreshold}
                                            onUpdateMasteryThreshold={handleUpdateMasteryThreshold}
                                            learningBatchSize={learningBatchSize}
                                            onUpdateLearningBatchSize={handleUpdateLearningBatchSize}
                                            learningPenalty={learningPenalty}
                                            onUpdateLearningPenalty={handleUpdateLearningPenalty}
                                            onLogout={handleLogout}
                                        />
                                    </div>
                                    <BottomNav
                                        profileName={currentProfile?.displayName}
                                        profiles={profiles}
                                        currentProfileId={currentProfile?.id}
                                        onProfileSelect={handleProfileSelect}
                                    />
                                </ProfileGuard>
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    />

                    <Route
                        path="/profiles/:profileId/session"
                        element={
                            user ? (
                                <ProfileGuard
                                    profiles={profiles}
                                    isLoading={isLoading || isInitializing || isProfilesLoading}
                                    currentProfile={currentProfile}
                                    onProfileSwitch={handleProfileSync}
                                >
                                    {sessionQueue.length > 0 || isSessionCompleted ? renderSession() : <Navigate to={`/profiles/${currentProfile?.id}/study`} replace />}
                                </ProfileGuard>
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    />

                    <Route path="*" element={<Navigate to={user ? "/profiles" : "/login"} replace />} />
                </Routes>
            </main>
        </div>
    );
};


export default App;