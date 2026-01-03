import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { FlashcardData, User, Profile } from './types';
import { DEFAULT_CONFIG, STORAGE_KEYS } from './constants';
import { jwtDecode } from 'jwt-decode';
import {
    generateSessionContent,
    generateSingleExample
} from './services/geminiService';
import { loginWithGoogle } from './services/authService';
import { fetchProfileWords, updateWord, deleteWord, syncAndGetProfiles, createProfile, batchAddWords } from './services/profileService';
import { addToQueue } from './services/queueService';
import { HomeScreen } from './components/HomeScreen';
import { Flashcard } from './components/Flashcard';
import { SignInPage } from './components/SignInPage';
import { ProfileSelectionPage } from './components/ProfileSelectionPage';
import { ProfileGuard } from './components/ProfileGuard';
import { CooldownDialog } from './components/CooldownDialog';
import { AddWordsScreen } from './components/AddWordsScreen';
import { BottomNav } from './components/BottomNav';
import { SummaryScreen } from './components/SummaryScreen';
import { PreferencesScreen } from './components/PreferencesScreen';
import { getLevelInfo, EXP_SOURCES } from './services/levelService';
import { ArrowLeft, Check, X, Repeat, Trophy, Home, RotateCcw, Star, Zap, AlertTriangle } from 'lucide-react';
import { updateProfile } from './services/profileService';

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
    const [showCooldownDialog, setShowCooldownDialog] = useState(false);
    const [cooldownMessage, setCooldownMessage] = useState('');
    const [cooldownTitle, setCooldownTitle] = useState('Great Job!');
    const [cooldownButtonText, setCooldownButtonText] = useState("Okay, I'll be back!");

    // Data State
    const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);

    // Derived Statistics
    const masteredToday = useMemo(() => {
        const today = new Date().toDateString();
        return (flashcards || []).filter(c => c && c.masteredAt && new Date(c.masteredAt).toDateString() === today).length;
    }, [flashcards]);

    const reviewedToday = useMemo(() => {
        const today = new Date().toDateString();
        return (flashcards || []).filter(c => c && c.lastReviewedAt && new Date(c.lastReviewedAt).toDateString() === today).length;
    }, [flashcards]);

    const masteredThisWeek = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return (flashcards || []).filter(c => c && c.masteredAt && new Date(c.masteredAt) >= sevenDaysAgo).length;
    }, [flashcards]);

    const reviewedThisWeek = useMemo(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return (flashcards || []).filter(c => c && c.lastReviewedAt && new Date(c.lastReviewedAt) >= sevenDaysAgo).length;
    }, [flashcards]);

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

    // EXP tracking for Session
    const [sessionExpBreakdown, setSessionExpBreakdown] = useState({
        reviewedCount: 0,
        gotItCount: 0,
        masteredCount: 0
    });
    const sessionBreakdownRef = useRef({ reviewedCount: 0, gotItCount: 0, masteredCount: 0 });
    const [sessionExpSnapshot, setSessionExpSnapshot] = useState<{ oldExp: number; newExp: number } | null>(null);
    const [animatedTotalExp, setAnimatedTotalExp] = useState(0);
    const [isAtMaxThreshold, setIsAtMaxThreshold] = useState(false);
    const [animationStage, setAnimationStage] = useState(0);

    useEffect(() => {
        if (isSessionCompleted) {
            const timer1 = setTimeout(() => setAnimationStage(1), 400);  // Reviewed count
            const timer2 = setTimeout(() => setAnimationStage(2), 800);  // First try bonus
            const timer3 = setTimeout(() => setAnimationStage(3), 1200); // Mastered count
            const timer4 = setTimeout(() => setAnimationStage(4), 1600); // Total EXP gained
            const timer5 = setTimeout(() => setAnimationStage(5), 2200); // EXP bar appears
            const timer6 = setTimeout(() => setAnimationStage(6), 2600); // EXP bar starts animating
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
                clearTimeout(timer4);
                clearTimeout(timer5);
                clearTimeout(timer6);
            };
        } else {
            setAnimationStage(0);
        }
    }, [isSessionCompleted]);

    // EXP Count-up Animation Effect
    useEffect(() => {
        if (animationStage === 5 && sessionExpSnapshot) {
            // Stage 5: Show bar at OLD value (before gain)
            setAnimatedTotalExp(sessionExpSnapshot.oldExp);
            setIsAtMaxThreshold(false);
        } else if (animationStage === 6 && sessionExpSnapshot) {
            // Stage 6: Animate the bar from old to new value
            const { oldExp, newExp } = sessionExpSnapshot;

            // Calculate level-up milestones (thresholds between old and new)
            const milestones: number[] = [oldExp];
            let currentExp = oldExp;
            while (true) {
                const info = getLevelInfo(currentExp);
                const threshold = info.totalExpToCurrentLevel + info.nextLevelThreshold;
                if (threshold < newExp) {
                    milestones.push(threshold);
                    currentExp = threshold;
                } else {
                    break;
                }
            }
            milestones.push(newExp);

            const startTime = performance.now();
            const segmentDuration = 1000; // Time per segment (fill to 100% OR fill from 0)
            const pauseDuration = 800; // Pause at 100% before resetting to 0

            let animationFrame: number;
            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const totalSegments = milestones.length - 1;
                let cI = 0, cS = 0, cW = false;

                for (let i = 0; i < totalSegments; i++) {
                    const mE = cS + segmentDuration, wL = (i < totalSegments - 1) ? pauseDuration : 0;
                    if (elapsed <= mE) { cI = i; break; }
                    else if (elapsed <= mE + wL) { cI = i; cW = true; break; }
                    cS = mE + wL; cI = i + 1;
                }
                cI = Math.min(cI, totalSegments - 1);
                const sE = milestones[cI], eE = milestones[cI + 1];
                const sEl = elapsed - cS, sPr = Math.min(sEl / segmentDuration, 1), eP = 1 - Math.pow(1 - sPr, 3);
                setAnimatedTotalExp(cW ? eE : Math.floor(sE + (eE - sE) * eP));
                setIsAtMaxThreshold(cW);
                if (elapsed < (totalSegments * segmentDuration + (totalSegments - 1) * pauseDuration)) {
                    animationFrame = requestAnimationFrame(animate);
                } else {
                    setAnimatedTotalExp(newExp); setIsAtMaxThreshold(false); setAnimationStage(7);
                }
            };

            animationFrame = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrame);
        }
    }, [animationStage, sessionExpSnapshot]);

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
            // Ensure global user state has the ID and latest info from backend
            if (data.user && user?.id !== data.user.id) {
                const updatedUser: User = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    picture: data.user.photoURL || user?.picture || ''
                };
                setUser(updatedUser);
                localStorage.setItem('word_fun_user', JSON.stringify(updatedUser));
            }
        } catch (e) {
            console.error("Failed to load profiles", e);
            setErrorMsg("Failed to load profiles. Please try again.");
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
                    tags: w.tags || [],
                    pronunciationUrl: w.pronunciationUrl, // Add this line
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

                    // Restore profiles for deep linking, but avoid duplicate on /profiles (handled by useEffect)
                    if (location.pathname !== '/profiles') {
                        await loadAllProfiles();
                    }

                    if (savedProfile) {
                        try {
                            const parsedProfile = JSON.parse(savedProfile);
                            if (parsedProfile && parsedProfile.id) {
                                setCurrentProfile(parsedProfile);
                                // Trigger background refresh of words
                                // loadWords(parsedProfile.id, false); // REMOVED: Managed by useEffect [currentProfile]

                                if (location.pathname === '/' || location.pathname === '/login') {
                                    navigate(`/profiles/${parsedProfile.id}/study`);
                                }
                            } else {
                                localStorage.removeItem('word_fun_profile');
                                if (location.pathname === '/') navigate('/profiles');
                            }
                        } catch (e) {
                            console.error("Failed to parse saved profile", e);
                            localStorage.removeItem('word_fun_profile');
                            if (location.pathname === '/') navigate('/profiles');
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
    }, [location.pathname, user?.id]);

    // Reload words whenever to ensure fresh data (including pronunciationUrl)
    useEffect(() => {
        if (currentProfile?.id) {
            loadWords(currentProfile.id, false);
        }
    }, [currentProfile?.id]);



    const handleRegenerateCard = async (cardToFix: FlashcardData) => {
        try {
            const allWords = (flashcards || []).filter(c => c && c.character).map(c => c.character);
            if (!currentProfile?.id) return;
            const updatedList = await generateSessionContent(currentProfile.id, [cardToFix], allWords);

            if (updatedList.length > 0) {
                const newCard = updatedList[0];
                const updatedFlashcards = (flashcards || []).map(c =>
                    (c && c.character === newCard.character) ? newCard : c
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

            // Randomly pick context words from flashcards state
            const targetLang = currentCard.language || 'zh';
            const sameLangWords = flashcards
                .filter(c => (c.language || 'zh') === targetLang)
                .map(c => c.character);

            const contextWords = [...sameLangWords].sort(() => 0.5 - Math.random()).slice(0, 100);

            const newChinese = await generateSingleExample(currentProfile.id, currentCard.character, contextExamples, contextWords);

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

    const handleBatchAddWords = async (words: string[]) => {
        if (!currentProfile?.id) return;
        try {
            const result = await batchAddWords(currentProfile.id, words);
            console.log(`Successfully added ${result.added} words, skipped ${result.skipped}`);
            // Silently refresh words list to show new ones if needed, 
            // though session words won't change until next session.
            loadWords(currentProfile.id, false);
        } catch (e) {
            console.error("Failed to batch add words", e);
            throw e;
        }
    };

    const startStudySession = async (lang: 'zh' | 'en' | 'all', selectedTags?: string[]) => {
        let pool: FlashcardData[] = flashcards;

        if (lang !== 'all') {
            pool = flashcards.filter(c => c.language === lang || (!c.language && lang === 'zh')); // Default old cards to zh if undefined
        }

        if (selectedTags && selectedTags.length > 0) {
            pool = pool.filter(c => c.tags && c.tags.some(t => selectedTags.includes(t)));
        }

        if (pool.length === 0) {
            setCooldownTitle("Time to Add Words!");
            const langText = lang === 'zh' ? 'Chinese' : lang === 'en' ? 'English' : '';
            const tagText = selectedTags && selectedTags.length > 0 ? ` with tags: ${selectedTags.join(', ')}` : '';
            setCooldownMessage(`No ${langText} cards available${tagText}! Add some words first.`);
            setCooldownButtonText("Go to Add Words");
            setShowCooldownDialog(true);
            return;
        }

        const now = new Date();
        const COOLDOWN_HOURS = 4;
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

        // Filter out cards that are on cooldown
        const eligiblePool = pool.filter(c => {
            if (!c.lastReviewedAt) return true; // Never reviewed
            const diff = now.getTime() - new Date(c.lastReviewedAt).getTime();
            return diff > cooldownMs;
        });

        // If no eligible cards but the original pool was not empty, it means all are on cooldown
        if (eligiblePool.length === 0 && pool.length > 0) {
            setCooldownTitle("Great Job!");
            setCooldownMessage(`All your ${lang === 'all' ? '' : lang === 'zh' ? 'Chinese ' : 'English '}words have been reviewed recently.\nCome back in a few hours to let your memory settle!`);
            setCooldownButtonText("Okay, I'll be back!");
            setShowCooldownDialog(true);
            return;
        }

        // --- STEP 1: Learning Pool (Active Words) ---
        // Use eligiblePool instead of global pool
        const activeCandidates = eligiblePool.filter(c => (c.correctCount || 0) < masteryThreshold);

        // Pick from fixed pool size of 30 oldest words
        const poolSize = DEFAULT_CONFIG.LEARNING_POOL_SIZE;
        const oldestPool = activeCandidates.slice(0, poolSize);

        // Randomly pick Batch Size from this pool
        const selectedLearning: FlashcardData[] = shuffleArray(oldestPool).slice(0, learningBatchSize);

        // --- STEP 2: Review Pool (Mastered Words) ---
        // Use eligiblePool instead of global pool
        const masteredCandidates = eligiblePool.filter(c => (c.correctCount || 0) >= masteryThreshold);
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
            // This case might happen if eligiblePool was small but logic didn't pick any (unlikely with above logic but safe to keep)
            setCooldownTitle("Great Job!");
            setCooldownMessage(`You've caught up with all your reviews for now!\nGreat job keeping your streak.`);
            setCooldownButtonText("Okay, I'll be back!");
            setShowCooldownDialog(true);
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
            console.log("[SESSION] Missing examples detected. Adding to queue...");

            // Non-blocking: Add to queue for background processing
            if (currentProfile?.id) {
                const queuePromises = selection
                    .filter(card => (!card.examples || card.examples.length === 0) && card.id)
                    .map(card => addToQueue(card.id, card.character, currentProfile.id!));

                Promise.all(queuePromises).catch(err => console.error("[SESSION] Failed to batch add to queue", err));
            }
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

        // Reset EXP Tracking for NEW session
        setSessionExpBreakdown({
            reviewedCount: 0,
            gotItCount: 0,
            masteredCount: 0
        });
        sessionBreakdownRef.current = { reviewedCount: 0, gotItCount: 0, masteredCount: 0 };
        setSessionExpSnapshot(null);
        setAnimationStage(0);

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

        // EXP Logic
        if (!isRevisionMode) {
            const isJustMastered = (currentCard.correctCount || 0) < masteryThreshold && newCorrect >= masteryThreshold;

            // Update state for UI
            setSessionExpBreakdown(prev => ({
                reviewedCount: prev.reviewedCount + 1,
                gotItCount: correct ? prev.gotItCount + 1 : prev.gotItCount,
                masteredCount: isJustMastered ? prev.masteredCount + 1 : prev.masteredCount
            }));

            // Update ref for immediate logic use in handleSessionComplete
            sessionBreakdownRef.current = {
                reviewedCount: sessionBreakdownRef.current.reviewedCount + 1,
                gotItCount: correct ? sessionBreakdownRef.current.gotItCount + 1 : sessionBreakdownRef.current.gotItCount,
                masteredCount: isJustMastered ? sessionBreakdownRef.current.masteredCount + 1 : sessionBreakdownRef.current.masteredCount
            };
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

        const updatedFlashcards = (flashcards || []).map(c =>
            (c && c.character === currentCard.character) ? updatedCard : c
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
            handleSessionComplete();
        }
    };

    const handleSessionComplete = async () => {
        if (!currentProfile) {
            setIsCardFlipped(false);
            setAnimationStage(0);
            setIsSessionCompleted(true);
            return;
        }

        // Finalize EXP Gain using the REF (avoiding stale state)
        const stats = sessionBreakdownRef.current;
        const gain = (stats.reviewedCount * EXP_SOURCES.REVIEW) +
            (stats.gotItCount * EXP_SOURCES.GOT_IT) +
            (stats.masteredCount * EXP_SOURCES.MASTERED);

        const oldExp = currentProfile.exp || 0;
        const newTotalExp = oldExp + gain;

        // Capture snapshot for results screen animation BEFORE triggering completion
        setSessionExpSnapshot({ oldExp, newExp: newTotalExp });

        // Reset and trigger UI
        setIsCardFlipped(false);
        setAnimationStage(0);
        setIsSessionCompleted(true);

        try {
            // Calculate new level
            const levelInfo = getLevelInfo(newTotalExp);
            const newLevel = levelInfo.level;

            // Update Backend
            if (user && user.id) {
                await updateProfile(currentProfile.id, { exp: newTotalExp, level: newLevel });
            }

            // Update Local State
            const updatedProfile = { ...currentProfile, exp: newTotalExp, level: newLevel };
            setCurrentProfile(updatedProfile);
            setProfiles(prev => (prev || []).map(p => (p && p.id === updatedProfile.id) ? updatedProfile : p));
            localStorage.setItem('word_fun_profile', JSON.stringify(updatedProfile));

            console.log(`[EXP] Gained ${gain} EXP. New total: ${newTotalExp}. Level: ${newLevel}`);
        } catch (err) {
            console.error("Failed to save EXP gain", err);
        }
    };

    const handleFlip = () => {
        setIsCardFlipped(!isCardFlipped);
    };

    const handleLoginSuccess = async (googleResponse: any) => {
        try {

            if (!googleResponse.credential) {
                throw new Error("No credential received from Google");
            }

            // 1. Verify with backend (Exchange specific logic)
            // Note: loginWithGoogle calls the backend /login endpoint
            const authData = await loginWithGoogle(googleResponse.credential);

            // 2. Decode the Google ID Token to getting profile info (Picture, Name)
            // We use the ID Token for display info because our backend auth response might be minimal
            const decoded: any = jwtDecode(googleResponse.credential);

            // 3. Persist Session
            // Use the user object directly from the backend response which has the ID
            setUser(authData.user);
            localStorage.setItem('word_fun_user', JSON.stringify(authData.user));

            if (authData.token) {
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
            }
            if (authData.refresh_token) {
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.refresh_token);
            }

            // 4. Load Profiles immediately to ensure fresh state
            console.log("Loading profiles for new session...");
            // await loadAllProfiles(); // REMOVED: Managed by useEffect

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

                    <div className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-wide">
                        {revisionRoundCount === 0 ? "Perfect Run!" : `${revisionRoundCount} Revision Round${revisionRoundCount !== 1 ? 's' : ''}`}
                    </div>

                    <div className="w-full bg-white/50 border-2 border-coffee/10 rounded-2xl p-4 mb-6 space-y-3 shadow-sm">
                        {animationStage >= 1 && (
                            <div className="flex justify-between items-center animate-in slide-in-from-left duration-300">
                                <span className="text-xs font-black text-coffee uppercase opacity-60">Reviewed Words × {sessionExpBreakdown.reviewedCount}</span>
                                <span className="font-black text-matcha-dark">+{sessionExpBreakdown.reviewedCount * EXP_SOURCES.REVIEW}</span>
                            </div>
                        )}
                        {animationStage >= 2 && (
                            <div className="flex justify-between items-center animate-in slide-in-from-left duration-300">
                                <span className="text-xs font-black text-coffee uppercase opacity-60">First Try Bonus × {sessionExpBreakdown.gotItCount}</span>
                                <span className="font-black text-matcha-dark">+{sessionExpBreakdown.gotItCount * EXP_SOURCES.GOT_IT}</span>
                            </div>
                        )}
                        {animationStage >= 3 && (
                            <div className="flex justify-between items-center animate-in slide-in-from-left duration-300">
                                <span className="text-xs font-black text-coffee uppercase opacity-60">Newly Mastered × {sessionExpBreakdown.masteredCount}</span>
                                <span className="font-black text-matcha-dark">+{sessionExpBreakdown.masteredCount * EXP_SOURCES.MASTERED}</span>
                            </div>
                        )}
                        {animationStage >= 4 && (
                            <div className="pt-2 border-t border-coffee/10 flex justify-between items-center font-black animate-in fade-in duration-500">
                                <span className="text-coffee">Total Exp Gained</span>
                                <div className="flex items-center gap-1 text-yolk-dark">
                                    <Zap className="w-4 h-4 fill-yolk stroke-coffee" />
                                    <span>+{(sessionExpBreakdown.reviewedCount * EXP_SOURCES.REVIEW) + (sessionExpBreakdown.gotItCount * EXP_SOURCES.GOT_IT) + (sessionExpBreakdown.masteredCount * EXP_SOURCES.MASTERED)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {animationStage >= 5 && sessionExpSnapshot && (
                        <div className="w-full mb-8 space-y-2 animate-in fade-in duration-1000">
                            {(() => {
                                const { oldExp, newExp } = sessionExpSnapshot;
                                const oldInfo = getLevelInfo(oldExp);
                                const newInfo = getLevelInfo(newExp);

                                // Use the animated value for display
                                let displayInfo = getLevelInfo(animatedTotalExp);
                                const isLevelUp = newInfo.level > oldInfo.level;
                                const displayIsLevelUp = displayInfo.level > oldInfo.level;

                                // Handle "100%" state at thresholds
                                if (isAtMaxThreshold) {
                                    displayInfo = {
                                        level: displayInfo.level - 1,
                                        expInLevel: getLevelInfo(animatedTotalExp - 1).nextLevelThreshold,
                                        nextLevelThreshold: getLevelInfo(animatedTotalExp - 1).nextLevelThreshold,
                                        totalExpToCurrentLevel: 0 // Not needed for display
                                    };
                                }

                                return (
                                    <>
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-coffee text-cream px-2 py-0.5 rounded-lg text-xs font-black transition-all duration-500">
                                                    LV. {displayInfo.level}
                                                </span>
                                                {(displayIsLevelUp || isAtMaxThreshold) && (
                                                    <span className="text-salmon font-black text-sm animate-bounce">LEVEL UP! 🎊</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-black text-coffee/40 uppercase tracking-widest transition-all duration-500">
                                                {displayInfo.expInLevel} / {displayInfo.nextLevelThreshold} EXP
                                            </span>
                                        </div>
                                        <div className="w-full h-4 bg-coffee/10 rounded-full overflow-hidden border-2 border-coffee/20 p-0.5 relative shadow-inner">
                                            <div
                                                className={`h-full bg-gradient-to-r from-yolk to-salmon rounded-full transition-all ease-out shadow-[0_0_8px_rgba(255,179,0,0.4)] ${animationStage === 6 ? 'duration-0' : 'duration-1000'}`}
                                                style={{ width: `${(displayInfo.expInLevel / displayInfo.nextLevelThreshold) * 100}%` }}
                                            >
                                                <div className="absolute top-0 right-0 w-full h-1/2 bg-white/20 rounded-full"></div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}



                    <button
                        onClick={() => navigate(currentProfile ? `/profiles/${currentProfile.id}/study` : '/profiles')}
                        className={`w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-300 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 ${animationStage < 7 ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-in fade-in slide-in-from-bottom-4 duration-500'}`}
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
                <header className="sticky top-0 z-20 bg-cream/90 backdrop-blur-sm border-b-2 border-coffee/10 px-4 py-3 flex justify-between items-center shrink-0 h-14 text-coffee">
                    <button
                        onClick={() => navigate(currentProfile ? `/profiles/${currentProfile.id}/study` : '/profiles')}
                        className="text-coffee/70 hover:text-salmon flex items-center gap-1 font-bold text-sm transition-colors rounded-full hover:bg-white/50 px-2 py-1"
                    >
                        <ArrowLeft className="w-5 h-5 stroke-[3]" />
                        Exit
                    </button>

                    {isRevisionMode ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-yolk text-coffee rounded-xl text-xs font-bold border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] transform -rotate-1">
                            <Repeat className="w-3 h-3 stroke-[3]" />
                            Revision {revisionRoundCount}
                        </div>
                    ) : (
                        <div className="font-bold text-coffee flex flex-col items-center leading-none">
                            <span className="text-sm">Card {currentIndex + 1}</span>
                            <span className="text-coffee/40 text-[10px] uppercase font-black tracking-widest">of {sessionQueue.length}</span>
                        </div>
                    )}

                    <div className="w-10"></div>
                </header>

                {sessionQueue.length > 0 && (
                    <div className="w-full flex-1 flex flex-col items-center pb-safe px-4 landscape:px-2 min-h-0">
                        {/* Progress Bar Container */}
                        <div className="w-full max-w-xs bg-coffee/10 h-4 landscape:h-2 rounded-full overflow-hidden shrink-0 mt-6 landscape:mt-2 mb-4 landscape:mb-2 border-2 border-white ring-2 ring-coffee/10 relative">
                            <div className="absolute inset-0 w-full h-full opacity-20 bg-[radial-gradient(circle,_transparent_20%,_#fff_20%,_#fff_80%,_transparent_80%,_transparent),_radial-gradient(circle,_transparent_20%,_#fff_20%,_#fff_80%,_transparent_80%,_transparent)] bg-[length:10px_10px] bg-[position:0_0,_5px_5px] animate-[slide_2s_linear_infinite]"></div>
                            <div
                                className={`h-full transition-all duration-300 relative ${isRevisionMode ? 'bg-yolk' : 'bg-salmon'}`}
                                style={{ width: `${((currentIndex + 1) / sessionQueue.length) * 100}%` }}
                            >
                                <div className="absolute top-1 right-1 w-full h-[3px] bg-white/30 rounded-full"></div>
                            </div>
                        </div>

                        {/* Middle Row: Left Button | Card | Right Button */}
                        <div className="flex-1 w-full flex flex-col landscape:flex-row items-center justify-center min-h-0 py-2 landscape:py-0 landscape:gap-4">

                            {/* LEFT ACTION (Portrait: Bottom Left | Landscape: Side Left) */}
                            <div className="hidden landscape:flex landscape:w-32 landscape:h-full items-center justify-end shrink-0">
                                {!isCardFlipped ? (
                                    <button
                                        onClick={() => handleRate(false)}
                                        className={`p-4 rounded-3xl border-2 font-black text-sm shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex flex-col items-center gap-1 ${pendingScore === false ? 'bg-salmon text-white border-coffee ring-2 ring-salmon ring-offset-2' : 'bg-white border-coffee/20 text-coffee/60 hover:bg-salmon/10 hover:text-salmon'}`}
                                    >
                                        <X className="w-6 h-6 stroke-[3]" />
                                        Forgot
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleFlip}
                                        className="p-4 rounded-3xl bg-white text-coffee font-black text-sm border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex flex-col items-center gap-1"
                                    >
                                        <RotateCcw className="w-5 h-5 stroke-[3]" />
                                        Flip Back
                                    </button>
                                )}
                            </div>

                            {/* THE CARD */}
                            <div className="flex-1 flex items-center justify-center min-h-0 w-full landscape:h-full">
                                <Flashcard
                                    data={sessionQueue[currentIndex]}
                                    allWords={flashcards}
                                    isFlipped={isCardFlipped}
                                    onFlip={handleFlip}
                                    autoPlaySound={autoPlaySound}
                                    onRegenerate={() => handleRegenerateCard(sessionQueue[currentIndex])}
                                    onRegenerateExample={handleRegenerateSingleExample}
                                    masteryThreshold={masteryThreshold}
                                    onAddWords={handleBatchAddWords}
                                />
                            </div>

                            {/* RIGHT ACTION (Portrait: Bottom Right | Landscape: Side Right) */}
                            <div className="hidden landscape:flex landscape:w-32 landscape:h-full items-center justify-start shrink-0">
                                {!isCardFlipped ? (
                                    <button
                                        onClick={() => handleRate(true)}
                                        className={`p-4 rounded-3xl font-black text-sm border-2 shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex flex-col items-center gap-1 ${pendingScore === true ? 'bg-matcha text-coffee border-coffee ring-2 ring-matcha ring-offset-2' : 'bg-matcha border-coffee text-coffee'}`}
                                    >
                                        <Check className="w-6 h-6 stroke-[3]" />
                                        Got it
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNextCard}
                                        className="p-4 rounded-3xl bg-coffee text-cream font-black text-sm border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,0.4)] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex flex-col items-center gap-1"
                                    >
                                        Next
                                        <ArrowLeft className="w-5 h-5 rotate-180 stroke-[3]" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* BOTTOM ACTIONS (PORTRAIT ONLY) */}
                        <div className="w-full max-w-md shrink-0 py-4 flex landscape:hidden items-center justify-center gap-3 h-24">
                            {!isCardFlipped ? (
                                <>
                                    <button
                                        onClick={() => handleRate(false)}
                                        className={`flex-1 py-4 rounded-3xl border-2 font-black text-lg shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 ${pendingScore === false ? 'bg-salmon text-white border-coffee ring-2 ring-salmon ring-offset-2' : 'bg-white border-coffee/20 text-coffee/60 hover:bg-salmon/10 hover:text-salmon hover:border-salmon'}`}
                                    >
                                        <X className="w-6 h-6 stroke-[3]" />
                                        Forgot
                                    </button>

                                    <button
                                        onClick={() => handleRate(true)}
                                        className={`flex-1 py-4 rounded-3xl font-black text-lg border-2 shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 ${pendingScore === true ? 'bg-matcha text-coffee border-coffee ring-2 ring-matcha ring-offset-2' : 'bg-matcha border-coffee text-coffee'}`}
                                    >
                                        <Check className="w-6 h-6 stroke-[3]" />
                                        Got it
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleFlip}
                                        className="flex-1 py-4 rounded-3xl bg-white text-coffee font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-5 h-5 stroke-[3]" />
                                        Flip Back
                                    </button>
                                    <button
                                        onClick={handleNextCard}
                                        className="flex-[2] py-4 rounded-3xl bg-coffee text-cream font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,0.4)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,0.4)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2"
                                    >
                                        Next Card <ArrowLeft className="w-5 h-5 rotate-180 stroke-[3]" />
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
            <div className="h-screen w-full flex flex-col items-center justify-center bg-cream font-rounded gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-salmon/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-16 h-16 border-4 border-coffee border-t-salmon rounded-full animate-spin"></div>
                </div>
                <div className="text-coffee font-black text-xl animate-pulse">
                    Loading Fun...
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-cream flex flex-col font-rounded overflow-hidden">
            <CooldownDialog
                isOpen={showCooldownDialog}
                onClose={() => setShowCooldownDialog(false)}
                message={cooldownMessage}
                title={cooldownTitle}
                buttonText={cooldownButtonText}
            />
            {/* ... Global States ... */}

            <main className="flex-1 flex flex-col w-full max-w-screen-xl mx-auto relative min-h-0 overflow-hidden">
                {errorMsg && (
                    <div className="mx-4 mt-4 bg-salmon/10 text-salmon border-2 border-salmon p-3 rounded-2xl flex items-center justify-between font-bold shadow-sm animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span>{errorMsg}</span>
                        </div>
                        <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-salmon/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
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
                                            profileId={currentProfile?.id || ''}
                                            cardCountZh={flashcards.filter(c => c && (c.language === 'zh' || !c.language)).length}
                                            cardCountEn={flashcards.filter(c => c && c.language === 'en').length}
                                            onStart={startStudySession}
                                            onManage={() => navigate(`/profiles/${currentProfile?.id}/add`)}
                                            isSyncing={isLoading}
                                            onSync={() => currentProfile && loadWords(currentProfile.id)}
                                            profileName={currentProfile?.displayName}
                                            avatarId={currentProfile?.avatarId}
                                            masteredCount={flashcards.filter(c => c && (c.correctCount || 0) >= masteryThreshold).length}
                                            reviewedCount={flashcards.reduce((acc, curr) => acc + (curr ? (curr.revisedCount || 0) : 0), 0)}
                                            masteredToday={masteredToday}
                                            reviewedToday={reviewedToday}
                                            masteredThisWeek={masteredThisWeek}
                                            reviewedThisWeek={reviewedThisWeek}
                                            exp={currentProfile?.exp || 0}
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
                                        <SummaryScreen
                                            profileId={currentProfile?.id || ''}
                                            cards={flashcards}
                                            masteryThreshold={masteryThreshold}
                                            onUpdateWord={async (wordId: string, updates: any) => {
                                                // Optimistic update
                                                const updatedCards = (flashcards || []).map(c => (c && c.id === wordId) ? { ...c, ...updates } : c);
                                                saveCards(updatedCards);
                                                // Backend sync
                                                if (currentProfile) {
                                                    await updateWord(currentProfile.id, wordId, updates);
                                                }
                                            }}
                                            onDeleteWord={async (wordId: string) => {
                                                // Optimistic update
                                                const updatedCards = (flashcards || []).filter(c => c && c.id !== wordId);
                                                saveCards(updatedCards);
                                                // Backend sync
                                                if (currentProfile) {
                                                    await deleteWord(currentProfile.id, wordId);
                                                }
                                            }}
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
                        path="/profiles/:profileId/add"
                        element={
                            user ? (
                                <ProfileGuard
                                    profiles={profiles}
                                    isLoading={isLoading || isInitializing || isProfilesLoading}
                                    currentProfile={currentProfile}
                                    onProfileSwitch={handleProfileSync}
                                >
                                    <div className="flex-1 overflow-hidden h-full pb-20">
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
        </div >
    );
};


export default App;