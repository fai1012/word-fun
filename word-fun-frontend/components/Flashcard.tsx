import React, { useEffect } from 'react';
import { FlashcardData } from '../types';
import { Volume2, Check, Target, RefreshCw, Crown, Trash2 } from 'lucide-react';

interface FlashcardProps {
  data: FlashcardData;
  isFlipped: boolean;
  onFlip: () => void;
  autoPlaySound: boolean;
  onRegenerate?: () => void;
  onRegenerateExample?: (index: number) => Promise<void>;
  masteryThreshold: number;
}

export const Flashcard: React.FC<FlashcardProps> = ({ data, isFlipped, onFlip, autoPlaySound, onRegenerate, onRegenerateExample, masteryThreshold }) => {
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

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    setActiveSwipeIndex(index);
    setCurrentSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || activeSwipeIndex === null) return;

    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartRef.current.x;

    // Only allow swiping left (negative values), clamp at -100px
    if (deltaX < 0 && deltaX > -100) {
      setCurrentSwipeOffset(deltaX);
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

  // Reset all interactive states when the card changes (e.g. next card)
  useEffect(() => {
    setSwipedIndex(null);
    setActiveSwipeIndex(null);
    setCurrentSwipeOffset(0);
    setExpandedExample(null);
    setRegeneratingIndex(null);
  }, [data.character]);

  // ... (previous handlers)

  const handleExampleClick = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    // If we are currently swiping or viewing a swiped state, close it instead of expanding
    if (swipedIndex !== null) {
      setSwipedIndex(null);
      return;
    }
    setExpandedExample(text);
  };

  const handleCloseExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedExample(null);
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

            {/* Main Word Info - Reduced size for mobile */}
            <div className="mb-4 shrink-0 flex flex-col items-center text-center">
              <h3 className="text-4xl sm:text-6xl font-noto-serif-hk font-bold mb-1 leading-tight text-white drop-shadow-md">{data.character}</h3>
              {isMastered && (
                <div className="mt-2 flex items-center gap-1 text-yolk text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full border border-yolk/30">
                  <Crown className="w-3 h-3 fill-yolk" /> Mastered
                </div>
              )}
            </div>

            {/* Examples Section */}
            <div className="mt-2 pt-4 border-t-2 border-white/10 flex-1 flex flex-col min-h-0">
              <div className="text-[10px] text-latte/70 font-black uppercase tracking-widest mb-3 shrink-0">Examples</div>

              {displayExamples.length > 0 ? (
                <div className="flex flex-col gap-3 pb-2">
                  {displayExamples.map((ex, idx) => {
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
                <div className="flex-1 flex items-center justify-center text-slate-600 text-xs italic">
                  No examples available
                </div>
              )}
            </div>
          </div>

          {/* Expanded Example Overlay */}
          {expandedExample && (
            <div
              className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
              onClick={handleCloseExpanded}
            >
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-noto-serif-hk font-bold leading-relaxed text-white drop-shadow-lg">
                  {expandedExample}
                </p>
                <div className="mt-8 text-slate-400 text-sm uppercase tracking-widest animate-pulse">
                  Tap to close
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};