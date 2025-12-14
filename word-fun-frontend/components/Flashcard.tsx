import React, { useEffect } from 'react';
import { FlashcardData } from '../types';
import { Volume2, Check, Target, RefreshCw, Crown } from 'lucide-react';

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

  // Auto-play audio when flipped if enabled
  useEffect(() => {
    if (isFlipped && autoPlaySound) {
      const timer = setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(data.character);
        utterance.lang = 'zh-CN';
        window.speechSynthesis.speak(utterance);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isFlipped, data.character, autoPlaySound]);

  // Stop propagation on buttons to prevent flipping when clicking controls
  const handleAudioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(data.character);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  const handleRegenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRegenerate) {
      onRegenerate();
    }
  };

  const handleExampleRegenerate = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onRegenerateExample && regeneratingIndex === null) {
      setRegeneratingIndex(index);
      try {
        await onRegenerateExample(index);
      } finally {
        setRegeneratingIndex(null);
      }
    }
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

  return (
    <div
      className="relative h-full w-auto aspect-[3/4] max-w-full perspective-1000 cursor-pointer group mx-auto"
      onClick={onFlip}
    >
      <div
        className={`w-full h-full relative transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
          }`}
      >
        {/* FRONT OF CARD */}
        <div
          className="absolute inset-0 w-full h-full bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center p-1 sm:p-4 text-center overflow-hidden shadow-xl"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: isFlipped ? 0 : 1 }}
        >
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 border-t-4 border-l-4 border-rose-100 rounded-tl-3xl m-4"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-16 sm:h-16 border-b-4 border-r-4 border-rose-100 rounded-br-3xl m-4"></div>

          {/* Mastery Indicator Crown */}
          {isMastered && (
            <div className="absolute top-4 right-4 z-20 animate-in zoom-in duration-300" title="Mastered">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 fill-yellow-400 drop-shadow-md" />
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center z-10 w-full">

            {/* Dynamic Font Size Container */}
            <div className="w-full flex items-center justify-center px-0">
              <h2 className={`${getDynamicFontSize(data.character)} font-noto-serif-hk font-bold text-slate-800 leading-none whitespace-nowrap tracking-normal`}>
                {data.character}
              </h2>
            </div>

            <div className="mt-6 sm:mt-8 text-rose-500 animate-bounce opacity-50">
              <span className="text-[10px] sm:text-xs font-bold uppercase">Tap to Flip</span>
            </div>
          </div>

          {/* Stats indicator on Front */}
          {(data.revisedCount || 0) > 0 && (
            <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 text-slate-300 text-xs font-mono z-10">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {data.revisedCount}
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                {masteryPercentage}%
              </div>
            </div>
          )}
        </div>

        {/* BACK OF CARD */}
        <div
          className="absolute inset-0 w-full h-full rotate-y-180 bg-slate-900 text-white rounded-3xl flex flex-col overflow-hidden shadow-xl"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: isFlipped ? 1 : 0 }}
        >
          {/* Scrollable Container for Back Content */}
          <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

            {/* Header */}
            <div className="flex justify-between items-start mb-2 shrink-0">
              <div className="flex flex-col">
                <div className="text-rose-400 text-[10px] font-bold uppercase tracking-widest">Word</div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                  <span className="bg-white/10 px-1.5 py-0.5 rounded">Rev: {data.revisedCount || 0}</span>
                  <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">OK: {data.correctCount || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onRegenerate && (
                  <button
                    onClick={handleRegenerateClick}
                    className="p-2 bg-white/10 rounded-full hover:bg-blue-500 hover:text-white transition-colors group/regen"
                    title="Regenerate Content"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400 group-hover/regen:text-white" />
                  </button>
                )}
                <button
                  onClick={handleAudioClick}
                  className="p-2 bg-white/10 rounded-full hover:bg-rose-500 hover:text-white transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Word Info - Reduced size for mobile */}
            <div className="mb-4 shrink-0 flex flex-col items-center text-center">
              <h3 className="text-4xl sm:text-6xl font-noto-serif-hk font-bold mb-1 leading-tight">{data.character}</h3>
              {isMastered && (
                <div className="mt-2 flex items-center gap-1 text-yellow-500 text-xs font-bold uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded-full">
                  <Crown className="w-3 h-3 fill-yellow-500" /> Mastered
                </div>
              )}
            </div>

            {/* Examples Section */}
            <div className="mt-2 pt-4 border-t border-white/10 flex-1 flex flex-col min-h-0">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 shrink-0">Examples</div>

              {displayExamples.length > 0 ? (
                <div className="flex flex-col gap-3 pb-2">
                  {displayExamples.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg group/ex">
                      <p className="text-2xl sm:text-3xl font-noto-serif-hk font-medium leading-normal text-slate-100 flex-1">{ex.chinese}</p>
                      {onRegenerateExample && (
                        <button
                          onClick={(e) => handleExampleRegenerate(e, idx)}
                          disabled={regeneratingIndex !== null}
                          className={`ml-3 p-2 rounded-full hover:bg-white/10 transition-all ${regeneratingIndex === idx ? 'opacity-100' : 'opacity-0 group-hover/ex:opacity-100'}`}
                        >
                          <RefreshCw className={`w-4 h-4 text-slate-400 hover:text-white ${regeneratingIndex === idx ? 'animate-spin text-rose-400' : ''}`} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-xs italic">
                  No examples available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};