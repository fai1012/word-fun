import React, { useEffect } from 'react';
import { FlashcardData } from '../types';
import { Volume2, Check, Target, RefreshCw, Crown, Trash2, Plus, Minimize2 } from 'lucide-react';
import { analyzeSentence } from '../services/profileService';

interface FlashcardProps {
  data: FlashcardData;
  isFlipped: boolean;
  onFlip: () => void;
  autoPlaySound: boolean;
  onRegenerate?: () => void;
  onRegenerateExample?: (index: number) => Promise<void>;
  masteryThreshold: number;
  onAddWords?: (words: string[]) => Promise<void>;
  allWords?: FlashcardData[];
}

export const Flashcard: React.FC<FlashcardProps> = ({ data, allWords = [], isFlipped, onFlip, autoPlaySound, onRegenerate, onRegenerateExample, masteryThreshold, onAddWords }) => {
  const [regeneratingIndex, setRegeneratingIndex] = React.useState<number | null>(null);
  const [swipedIndex, setSwipedIndex] = React.useState<number | null>(null);

  // Auto-play audio when flipped if enabled
  useEffect(() => {
    if (isFlipped && autoPlaySound) {
      if (data.pronunciationUrl) {
        const timer = setTimeout(() => {
          const audio = new Audio(data.pronunciationUrl);
          audio.play().catch(err => console.error("Auto-play error", err));
        }, 300);
        return () => clearTimeout(timer);
      }
      // If no pronunciationUrl, do nothing (as per "hide speaker" requirement, likely implies no sound too)
    }
  }, [isFlipped, data.character, autoPlaySound, data.pronunciationUrl]);

  // Stop propagation on buttons to prevent flipping when clicking controls
  const handleAudioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.pronunciationUrl) {
      const audio = new Audio(data.pronunciationUrl);
      audio.play().catch(err => console.error("Audio playback error", err));
    }
  };

  const executeRegeneration = async (index: number) => {
    if (onRegenerateExample && regeneratingIndex === null) {
      setRegeneratingIndex(index);
      setSwipedIndex(null); // Close swipe on action
      try {
        await onRegenerateExample(index);
      } finally {
        setRegeneratingIndex(null);
      }
    }
  };

  // Swipe Logic
  const touchStartRef = React.useRef<{ x: number, y: number } | null>(null);
  const [currentSwipeOffset, setCurrentSwipeOffset] = React.useState<number>(0);
  const [activeSwipeIndex, setActiveSwipeIndex] = React.useState<number | null>(null);
  const [interactionMode, setInteractionMode] = React.useState<'none' | 'swipe' | 'scroll'>('none');

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    setActiveSwipeIndex(index);
    setCurrentSwipeOffset(0);
    setInteractionMode('none');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || activeSwipeIndex === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;

    if (interactionMode === 'none') {
      // Determine mode if moved enough
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          setInteractionMode('swipe');
        } else {
          setInteractionMode('scroll');
        }
      }
      return;
    }

    if (interactionMode === 'swipe') {
      // Prevent scrolling while swiping
      if (e.cancelable) e.preventDefault();

      // Only allow swiping left (negative values), clamp at -100px
      if (deltaX < 0 && deltaX > -100) {
        setCurrentSwipeOffset(deltaX);
      } else if (deltaX >= 0) {
        setCurrentSwipeOffset(0);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, index: number) => {
    if (!touchStartRef.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;

    // Threshold to snap open: -50px
    if (deltaX < -50) {
      setSwipedIndex(index); // Snap open
    } else if (activeSwipeIndex === index && deltaX > -50) {
      setSwipedIndex(null); // Snap close if not far enough
    }

    // Reset tracking
    touchStartRef.current = null;
    setActiveSwipeIndex(null);
    setCurrentSwipeOffset(0);
    setInteractionMode('none');
  };

  // Calculate generic accuracy for display
  // Calculate mastery progress for display
  const masteryPercentage = Math.min(100, Math.round(((data.correctCount || 0) / masteryThreshold) * 100));

  // Determine isMastered based on threshold
  const isMastered = (data.correctCount || 0) >= masteryThreshold;

  // Determine examples to show (Handle legacy data vs new list data)
  // Filter out empty examples
  const displayExamples = (data.examples && data.examples.length > 0
    ? data.examples
    : [{ chinese: data.example_cn, english: data.example_en }])
    .filter(ex => ex && ex.chinese && ex.chinese.trim() !== '');

  // Dynamic Font Sizing Logic
  const getDynamicFontSize = (text: string) => {
    if (!text) return "text-[4rem] sm:text-[5.5rem]";
    const len = text.length;
    // Aggressively tuned to fill mobile card width (~20-22rem space)
    // Note: 1rem = 16px usually. 

    if (len <= 1) return "text-[17rem] sm:text-[20rem]"; // ~272px wide
    if (len === 2) return "text-[10.5rem] sm:text-[13rem]"; // ~336px wide
    if (len === 3) return "text-[7rem] sm:text-[9.5rem]"; // ~336px wide
    if (len === 4) return "text-[5.2rem] sm:text-[7rem]"; // ~332px wide
    return "text-[4rem] sm:text-[5.5rem]"; // 5+ chars
  };

  const [expandedExample, setExpandedExample] = React.useState<string | null>(null);
  const [lemmaCache, setLemmaCache] = React.useState<Record<string, { text: string; lemma: string; pos: string }[]>>({});
  const [isPickerMode, setIsPickerMode] = React.useState(false);
  const [selectedGroups, setSelectedGroups] = React.useState<number[][]>([]);
  const [isAddingWords, setIsAddingWords] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [infoWord, setInfoWord] = React.useState<FlashcardData | null>(null);

  // Pre-fetch lemmas for all examples when data changes
  useEffect(() => {
    const fetchAllLemmas = async () => {
      const texts = displayExamples.map(ex => ex.chinese).filter(t => !!t);
      if (texts.length === 0) return;

      try {
        const { results } = await analyzeSentence(texts);
        const newCache: Record<string, any> = {};
        texts.forEach((text, i) => {
          newCache[text] = results[i];
        });
        setLemmaCache(newCache);
      } catch (err) {
        console.error("Failed to pre-fetch lemmas", err);
      }
    };

    fetchAllLemmas();
  }, [data.id, data.character, data.examples]);

  // Current expanded lemmas helper
  const expandedLemmas = expandedExample ? (lemmaCache[expandedExample] || []) : [];

  // Map for quick word lookup
  const wordMap = React.useMemo(() => {
    const map = new Map<string, FlashcardData>();
    allWords.forEach(w => {
      // Store primarily by rootForm if available, otherwise by character
      const key = (w.rootForm || w.character).toLowerCase();
      map.set(key, w);
    });
    return map;
  }, [allWords]);

  const getWordHighlightData = React.useCallback((wordData: FlashcardData) => {
    const correct = wordData.correctCount || 0;
    const progress = Math.min(1, correct / masteryThreshold);
    // HSL: 0 is red, 120 is green. We want a smooth transition.
    const hue = progress * 120;
    return {
      color: `hsl(${hue}, 80%, 60%)`,
      data: wordData
    };
  }, [masteryThreshold]);

  // Split text into selectable segments (Simple splitting, no pre-grouping)
  const segments = React.useMemo(() => {
    if (!expandedExample) return [];
    const lemmas = lemmaCache[expandedExample];
    if (lemmas && lemmas.length > 0) {
      return lemmas.map(l => l.text);
    }
    const segmentRegex = /[\u4e00-\u9fa5]|[a-zA-Z0-9']+|./g;
    return expandedExample.match(segmentRegex) || [];
  }, [expandedExample, lemmaCache]);

  // Map segments to highlighted words for display view
  const highlightMap = React.useMemo(() => {
    const map = new Map<number, { color: string, data: FlashcardData }>();
    if (!expandedExample || !segments.length || allWords.length === 0) return map;

    const lemmas = lemmaCache[expandedExample];
    // Use Lemmas for more accurate matching if available
    if (lemmas && lemmas.length > 0) {
      lemmas.forEach((token, idx) => {
        const lemma = token.lemma.toLowerCase();
        // Check if this lemma matches any of our known words (by root or character)
        const matchedWord = wordMap.get(lemma);
        if (matchedWord) {
          map.set(idx, getWordHighlightData(matchedWord));
        }
      });
      return map;
    }

    // Fallback to substring matching if no lemmas (legacy or wait state)
    const sortedVocab = [...allWords].sort((a, b) => b.character.length - a.character.length);

    sortedVocab.forEach(word => {
      const charToMatch = word.character.toLowerCase();
      let lastIdx = -1;

      while ((lastIdx = expandedExample.toLowerCase().indexOf(charToMatch, lastIdx + 1)) !== -1) {
        let currentPos = 0;
        const matchingSegmentIndices: number[] = [];

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const segStart = currentPos;
          const segEnd = currentPos + seg.length;

          if (segStart >= lastIdx && segEnd <= lastIdx + charToMatch.length) {
            // Only count as part of this word if it's not punctuation or symbols
            if (/[\u4e00-\u9fa5]|[a-zA-Z0-9']/.test(seg)) {
              matchingSegmentIndices.push(i);
            }
          }
          currentPos = segEnd;
        }

        const isConflict = matchingSegmentIndices.some(idx => map.has(idx));
        if (!isConflict && matchingSegmentIndices.length > 0) {
          const highlight = getWordHighlightData(word);
          matchingSegmentIndices.forEach(idx => map.set(idx, highlight));
        }
      }
    });

    return map;
  }, [expandedExample, lemmaCache, segments, allWords, wordMap, getWordHighlightData]);

  const colors = [
    'bg-matcha border-matcha',
    'bg-salmon border-salmon text-white',
    'bg-cyan-500 border-cyan-500 text-white',
    'bg-yolk border-yolk text-coffee',
    'bg-purple-500 border-purple-500 text-white',
  ];

  const handleExampleClick = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (swipedIndex !== null) {
      setSwipedIndex(null);
      return;
    }
    setExpandedExample(text);
  };

  const handleCloseExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedExample(null);
    setIsPickerMode(false);
    setSelectedGroups([]);
  };


  const handlePointerDown = (idx: number, isSelectable: boolean) => {
    if (!isSelectable) return;

    // Check if already selected
    const existingGroupIdx = selectedGroups.findIndex(g => g.includes(idx));
    if (existingGroupIdx !== -1) {
      setSelectedGroups(prev => prev.filter((_, i) => i !== existingGroupIdx));
      return;
    }

    setIsDragging(true);
    setSelectedGroups(prev => [...prev, [idx]]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    // Use elementFromPoint for robust hit-testing across touch and mouse
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const target = element?.closest('[data-index]');
    if (!target) return;

    const idx = parseInt(target.getAttribute('data-index') || '-1', 10);
    const isSelectable = target.getAttribute('data-selectable') === 'true';

    if (idx !== -1 && isSelectable) {
      const isAlreadySelected = selectedGroups.some(g => g.includes(idx));
      if (!isAlreadySelected) {
        setSelectedGroups(prev => {
          if (prev.length === 0) return [[idx]];
          const newGroups = [...prev];
          const lastGroup = [...newGroups[newGroups.length - 1]];
          if (!lastGroup.includes(idx)) {
            lastGroup.push(idx);
            newGroups[newGroups.length - 1] = lastGroup;
          }
          return newGroups;
        });
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleAddSelected = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddWords || selectedGroups.length === 0) return;

    const wordsToAdd: string[] = selectedGroups.map(group => {
      let word = "";
      group.forEach((idx, i) => {
        const seg = segments[idx];
        const isEnglish = /^[a-zA-Z0-9']+$/.test(seg);
        if (i > 0 && isEnglish) {
          word += " " + seg;
        } else {
          word += seg;
        }
      });
      return word.trim();
    });

    setIsAddingWords(true);
    try {
      await onAddWords(wordsToAdd);
      // Success - exit picker mode
      setIsPickerMode(false);
      setSelectedGroups([]);
      setExpandedExample(null);
    } catch (err) {
      console.error("Failed to add words", err);
    } finally {
      setIsAddingWords(false);
    }
  };

  return (
    <div
      className={`relative h-full w-auto aspect-[3/4] max-w-full perspective-1000 group mx-auto cursor-default`}
      onClick={() => {
        if (swipedIndex !== null) setSwipedIndex(null);
      }}
    >
      <div
        className={`w-full h-full relative transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
          }`}
      >
        {/* FRONT OF CARD */}
        <div
          className="absolute inset-0 w-full h-full bg-cream rounded-4xl border-4 border-coffee flex flex-col items-center justify-center p-1 sm:p-4 text-center overflow-hidden shadow-[6px_6px_0px_0px_rgba(93,64,55,0.2)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: isFlipped ? 0 : 1 }}
        >
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 border-t-[6px] border-l-[6px] border-coffee/10 rounded-tl-4xl m-5"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-16 sm:h-16 border-b-[6px] border-r-[6px] border-coffee/10 rounded-br-4xl m-5"></div>

          {/* Mastery Indicator Crown */}
          {isMastered && (
            <div className="absolute top-4 right-4 z-20 animate-in zoom-in duration-300" title="Mastered">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-yolk fill-yolk drop-shadow-md stroke-coffee stroke-2" />
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center z-10 w-full">

            {/* Dynamic Font Size Container */}
            <div className="w-full flex items-center justify-center px-0">
              <h2 className={`${getDynamicFontSize(data.character)} font-noto-serif-hk font-bold text-coffee leading-none whitespace-nowrap tracking-normal drop-shadow-sm`}>
                {data.character}
              </h2>
            </div>

            {/* Removed Tap to Flip hint */}
          </div>

          {/* Stats indicator on Front */}
          {(data.revisedCount || 0) > 0 && (
            <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 text-mocha/60 text-xs font-bold font-rounded z-10">
              <div className="flex items-center gap-1 bg-latte/30 px-3 py-1 rounded-full">
                <Target className="w-3 h-3" />
                {data.revisedCount}
              </div>
              <div className="flex items-center gap-1 bg-latte/30 px-3 py-1 rounded-full">
                <Check className="w-3 h-3" />
                {masteryPercentage}%
              </div>
            </div>
          )}
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 w-full h-full rotate-y-180 bg-coffee text-cream rounded-4xl border-4 border-coffee flex flex-col overflow-hidden shadow-[6px_6px_0px_0px_rgba(93,64,55,0.2)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: isFlipped ? 1 : 0 }}
        >
          {/* Scrollable Container for Back Content */}
          <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-mocha scrollbar-track-transparent">

            {/* Header */}
            <div className="flex justify-between items-start mb-2 shrink-0">
              <div className="flex flex-col">
                <div className="text-salmon text-[10px] font-black uppercase tracking-widest">Word</div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-latte">
                  <span className="bg-white/10 px-2 py-1 rounded-full font-bold">Rev: {data.revisedCount || 0}</span>
                  <span className="bg-matcha/20 text-matcha px-2 py-1 rounded-full font-bold">OK: {data.correctCount || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {data.pronunciationUrl && (
                  <button
                    onClick={handleAudioClick}
                    className="p-2 bg-white/10 rounded-full hover:bg-salmon hover:text-white transition-colors border-2 border-transparent hover:border-salmon"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Word Info - Increased size when no examples */}
            <div className={`flex flex-col items-center text-center transition-all duration-500 ${displayExamples.length === 0 ? 'flex-1 justify-end pb-4' : 'mb-4 shrink-0'}`}>
              <h3 className={`${displayExamples.length === 0 ? 'text-7xl sm:text-9xl' : 'text-4xl sm:text-6xl'} font-noto-serif-hk font-bold mb-1 leading-tight text-white drop-shadow-md`}>
                {data.character}
              </h3>
              {isMastered && (
                <div className="mt-2 flex items-center gap-1 text-yolk text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full border border-yolk/30">
                  <Crown className="w-3 h-3 fill-yolk" /> Mastered
                </div>
              )}
            </div>

            {/* Examples Section */}
            <div className={`flex flex-col min-h-0 ${displayExamples.length > 0 ? 'mt-2 pt-4 border-t-2 border-white/10 flex-1' : 'flex-1 justify-start pt-4'}`}>
              {displayExamples.length > 0 && (
                <div className="text-[10px] text-latte/70 font-black uppercase tracking-widest mb-3 shrink-0">Examples</div>
              )}

              {displayExamples.length > 0 ? (
                <div className="flex flex-col gap-3 pb-2">
                  {displayExamples.map((ex, idx) => {
                    // ... (rest of the mapping logic)
                    // Determine current offset for swipe animation
                    let translateX = 0;
                    if (activeSwipeIndex === idx) {
                      translateX = currentSwipeOffset;
                    } else if (swipedIndex === idx) {
                      translateX = -64; // Fixed open width (4rem)
                    }
                    const progress = Math.min(Math.abs(translateX) / 64, 1);

                    return (
                      <div key={idx} className="relative mb-3 h-auto"> {/* Wrapper */}

                        {/* Action Layer (Behind Content) */}
                        <div className={`absolute inset-0 flex items-center justify-end rounded-2xl pr-4 transition-colors ${swipedIndex === idx || activeSwipeIndex === idx ? 'bg-matcha/20' : ''}`}>
                          <button
                            className={`p-2 bg-matcha text-coffee rounded-xl shadow-lg active:scale-95 border-2 border-coffee`}
                            style={{
                              opacity: progress,
                              transform: `scale(${progress})`,
                              transition: activeSwipeIndex === idx ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              executeRegeneration(idx);
                            }}
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Content Layer (Draggable) */}
                        <div
                          className={`relative z-10 overflow-hidden flex items-center justify-between bg-mocha/20 p-4 rounded-2xl border-2 border-white/5 backdrop-blur-sm transition-transform ease-out
                           ${activeSwipeIndex === idx ? 'duration-0' : 'duration-300'}
                          ${swipedIndex !== null && swipedIndex !== idx ? 'opacity-50' : 'opacity-100'} 
                        `}
                          onClick={(e) => handleExampleClick(e, ex.chinese)}
                          onTouchStart={(e) => handleTouchStart(e, idx)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={(e) => handleTouchEnd(e, idx)}
                          style={{
                            backgroundColor: 'rgba(141, 110, 99, 0.2)', // mocha with opacity
                            transform: `translateX(${translateX}px)`
                          }}
                        >
                          <p className={`text-2xl sm:text-3xl font-noto-serif-hk font-medium leading-normal text-cream flex-1 drop-shadow-sm ${regeneratingIndex === idx ? 'opacity-30 blur-sm' : ''}`}>{ex.chinese}</p>


                          {/* Loading Indicator for Regeneration */}
                          {regeneratingIndex === idx && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50">
                              <RefreshCw className="w-6 h-6 text-green-400 animate-spin" />
                            </div>
                          )}

                          {/* Desktop Hover Refresh Button */}
                          {!regeneratingIndex && onRegenerateExample && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                executeRegeneration(idx);
                              }}
                              className="ml-4 p-2 rounded-full hover:bg-white/20 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:block"
                              title="Regenerate Example"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center text-latte/40 text-[13px] font-bold gap-3 transition-opacity duration-1000 animate-pulse mt-4">
                  <p className="tracking-wide">Working on examples...</p>
                  <RefreshCw className="w-5 h-5 animate-spin opacity-40" />
                </div>
              )}
            </div>
          </div>

          {expandedExample && (
            <div
              className={`absolute inset-0 z-50 bg-slate-900/98 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200 cursor-default`}
            >
              {/* Close Button Top Right */}
              <button
                onClick={handleCloseExpanded}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-salmon hover:text-white text-slate-400 rounded-full transition-all active:scale-90 border border-white/10"
                title="Minimize"
              >
                <Minimize2 className="w-6 h-6" />
              </button>

              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
                {!isPickerMode ? (
                  <>
                    <div className="flex flex-wrap justify-center gap-x-1 gap-y-3 px-4">
                      {segments.map((char, idx) => {
                        const highlight = highlightMap.get(idx);
                        const isSelectable = /[\u4e00-\u9fa5]|[a-zA-Z0-9']/.test(char);

                        if (!isSelectable) {
                          return (
                            <span key={idx} className="text-4xl sm:text-5xl font-noto-serif-hk font-bold leading-relaxed text-white/60">
                              {char}
                            </span>
                          );
                        }

                        return (
                          <span
                            key={idx}
                            onClick={(e) => {
                              if (highlight) {
                                e.stopPropagation();
                                setInfoWord(highlight.data);
                              }
                            }}
                            className="text-4xl sm:text-5xl font-noto-serif-hk font-bold leading-relaxed drop-shadow-lg transition-all active:scale-95"
                            style={{
                              color: highlight ? highlight.color : 'white',
                              cursor: highlight ? 'pointer' : 'default',
                              textDecoration: highlight ? 'underline' : 'none',
                              textDecorationColor: highlight ? 'rgba(255,255,255,0.2)' : 'transparent',
                              textUnderlineOffset: '8px'
                            }}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsPickerMode(true); }}
                        className="px-6 py-2.5 bg-salmon text-white rounded-full font-bold shadow-lg shadow-salmon/20 active:scale-95 transition-transform flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        Add Word
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-200">
                    <h4 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-2 w-full text-center">Select characters to add</h4>

                    <div
                      className="flex flex-wrap justify-center gap-2 mb-10 select-none touch-none"
                      onPointerMove={handlePointerMove}
                      onPointerLeave={handlePointerUp}
                      onPointerUp={handlePointerUp}
                      style={{ touchAction: 'none' }}
                    >
                      {segments.map((char, idx) => {
                        const isSelectable = /[\u4e00-\u9fa5]|[a-zA-Z0-9']/.test(char);
                        const isSpace = char === ' ';

                        if (isSpace) return <div key={idx} className="w-4 h-12 sm:h-14" />;

                        const groupIndex = selectedGroups.findIndex(g => g.includes(idx));
                        const isSelected = groupIndex !== -1;
                        const colorClass = isSelected ? colors[groupIndex % colors.length] : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30 hover:text-white/60';

                        return (
                          <button
                            key={idx}
                            data-index={idx}
                            data-selectable={isSelectable}
                            disabled={!isSelectable}
                            onPointerDown={() => handlePointerDown(idx, isSelectable)}
                            className={`min-w-[3rem] h-12 sm:min-w-[3.5rem] sm:h-14 px-4 flex items-center justify-center text-2xl sm:text-3xl font-bold font-noto-serif-hk rounded-xl border-2 transition-all ${!isSelectable
                              ? 'text-white/20 border-white/5 cursor-default'
                              : isSelected
                                ? `${colorClass} shadow-lg scale-110 active:scale-100`
                                : colorClass
                              }`}
                          >
                            {char}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsPickerMode(false); setSelectedGroups([]); }}
                        className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddSelected}
                        disabled={selectedGroups.length === 0 || isAddingWords}
                        className={`flex-[2] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${selectedGroups.length > 0 && !isAddingWords
                          ? 'bg-matcha text-coffee shadow-lg shadow-matcha/20 active:scale-95'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                      >
                        {isAddingWords ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-5 h-5 stroke-[3]" />
                            Add Selected
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Overlay for Existing Word */}
      {infoWord && (
        <div
          className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setInfoWord(null)}
        >
          <div
            className="w-full max-w-xs bg-coffee border-2 border-white/20 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-latte text-[10px] font-black uppercase tracking-[0.2em] mb-1">Vocabulary Info</div>
              <h5 className="text-5xl font-noto-serif-hk font-bold text-white mb-6 underline decoration-white/10 underline-offset-8">
                {infoWord.character}
              </h5>

              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-salmon text-[10px] font-black uppercase tracking-wider mb-1">Attempts</div>
                  <div className="text-2xl font-black text-white">{infoWord.revisedCount || 0}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-matcha text-[10px] font-black uppercase tracking-wider mb-1">Correct</div>
                  <div className="text-2xl font-black text-white">{infoWord.correctCount || 0}</div>
                </div>
              </div>

              <button
                onClick={() => setInfoWord(null)}
                className="w-full py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};