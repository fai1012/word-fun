import React, { useState, useEffect } from 'react';
import { Layers, Sparkles, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AvatarPicker, AVATAR_MAP } from './AvatarPicker';

interface HomeScreenProps {
  cardCountZh: number;
  cardCountEn: number;
  onStart: (lang: 'zh' | 'en' | 'all') => void;
  onManage: () => void;
  linkedSheetUrl?: string;
  isSyncing: boolean;
  onSync: () => void;
  profileName?: string;
  avatarId?: string;
  masteredCount: number;
  reviewedCount: number;
  // New stats
  masteredToday?: number;
  reviewedToday?: number;
  masteredThisWeek?: number;
  reviewedThisWeek?: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  cardCountZh,
  cardCountEn,
  onStart,
  onManage,
  profileName,
  avatarId,
  masteredCount,
  reviewedCount,
  masteredToday = 0,
  reviewedToday = 0,
  masteredThisWeek = 0,
  reviewedThisWeek = 0
}) => {
  const totalCards = cardCountZh + cardCountEn;
  const avatarSrc = avatarId ? AVATAR_MAP[avatarId] : null;

  // Carousel State
  const [activeSlide, setActiveSlide] = useState(0);
  const totalSlides = 3;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 6000); // Auto-rotate every 6 seconds
    return () => clearInterval(timer);
  }, []);

  const slideData = [
    {
      label: "Today's Progress",
      primary: { label: "Reviewed", value: reviewedToday, color: "text-salmon" },
      secondary: { label: "Mastered", value: masteredToday, color: "text-indigo-500" },
      icon: <Sparkles className="w-5 h-5 text-salmon" />,
      tag: "Dailies"
    },
    {
      label: "Last 7 Days",
      primary: { label: "Reviewed", value: reviewedThisWeek, color: "text-salmon" },
      secondary: { label: "Mastered", value: masteredThisWeek, color: "text-indigo-500" },
      icon: <Layers className="w-5 h-5 text-indigo-500" />,
      tag: "Weekly"
    },
    {
      label: "Overall Record",
      primary: { label: "Total Reviewed", value: reviewedCount, color: "text-salmon" },
      secondary: { label: "Total Mastered", value: masteredCount, color: "text-indigo-500" },
      icon: <img src={avatarSrc || ''} className="w-5 h-5 rounded-full" alt="" />,
      tag: "All Time"
    }
  ];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev + 1) % totalSlides);
  };

  return (
    <div className="flex flex-col items-center justify-center pt-4 pb-8 px-4 w-full max-w-lg mx-auto text-center overflow-y-auto">

      {/* Application Logo / Avatar */}
      <div className="mb-6 relative group cursor-default">
        {/* Glow effect */}
        <div className={`absolute -inset-2 bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-500 blur-lg opacity-30 ${!avatarSrc ? 'rounded-[2rem] group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse' : 'rounded-full'}`}></div>

        {/* Main Container */}
        <div className={`relative w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-rose-500 shadow-xl flex items-center justify-center border-[3px] border-white/10 ${!avatarSrc && !profileName ? 'rounded-[1.5rem] transform transition-transform group-hover:scale-105 group-hover:rotate-2' : 'rounded-full'} ${avatarSrc || profileName ? 'overflow-hidden' : ''} ${!avatarSrc && profileName ? 'bg-rose-100' : ''}`}>

          {avatarSrc ? (
            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
          ) : profileName ? (
            <div className="w-full h-full bg-rose-100 flex items-center justify-center">
              <span className="text-4xl font-bold text-rose-500">
                {profileName.substring(0, 1).toUpperCase()}
              </span>
            </div>
          ) : (
            <>
              {/* Glossy top shine (Logo only) */}
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-[1.3rem] pointer-events-none"></div>

              {/* Inner ring (Logo only) */}
              <div className="absolute inset-1 border border-white/20 rounded-[1.4rem] pointer-events-none"></div>

              {/* The Character */}
              <span
                className="text-5xl text-white drop-shadow-lg select-none pb-1 pl-0.5"
                style={{ fontFamily: "'Zhi Mang Xing', cursive" }}
              >
                認
              </span>
            </>
          )}
        </div>
      </div>

      {profileName && (
        <h1 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">
          Hi, {profileName}!
        </h1>
      )}

      {reviewedCount > 0 ? (
        <div className="mb-6 w-full px-2">
          <div className="relative overflow-hidden bg-white/90 p-5 rounded-4xl shadow-[6px_6px_0px_0px_rgba(93,64,55,0.2)] border-4 border-coffee group/carousel min-h-[170px] flex flex-col justify-between">

            {/* Slide Content */}
            <div className="relative flex-1 overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {slideData.map((slide, i) => (
                  <div key={i} className="min-w-full flex flex-col justify-center items-center px-8">
                    <span className="inline-block px-3 py-0.5 bg-coffee/5 text-coffee/60 text-[10px] font-black uppercase tracking-widest rounded-full mb-2 border border-coffee/10">{slide.tag}</span>
                    <h2 className="text-lg font-black text-coffee mb-0.5 flex items-center gap-2">
                      {slide.label}
                    </h2>
                    <div className="flex items-baseline gap-6 mt-2">
                      <div className="text-center">
                        <div className={`text-3xl font-black ${slide.primary.color}`}>{slide.primary.value}</div>
                        <div className="text-[10px] font-bold text-coffee/40 uppercase tracking-wider">{slide.primary.label}</div>
                      </div>
                      <div className="w-px h-8 bg-coffee/10 self-center"></div>
                      <div className="text-center">
                        <div className={`text-3xl font-black ${slide.secondary.color}`}>{slide.secondary.value}</div>
                        <div className="text-[10px] font-bold text-coffee/40 uppercase tracking-wider">{slide.secondary.label}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-cream text-coffee border-2 border-coffee opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-salmon hover:text-white shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none z-10"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-cream text-coffee border-2 border-coffee opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-salmon hover:text-white shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none z-10"
            >
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-1.5 mt-3 relative z-10">
              {slideData.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-1.5 rounded-full border-2 border-coffee transition-all duration-300 ${activeSlide === i ? 'w-6 bg-salmon shadow-[1px_1px_0px_0px_rgba(93,64,55,1)]' : 'w-1.5 bg-cream hover:bg-coffee/10'}`}
                />
              ))}
            </div>
          </div>
          <p className="text-coffee/20 text-[10px] font-black mt-2 uppercase tracking-widest">Swipe to see more progress! ✨</p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">
            Haven't started yet?
          </h1>
          <p className="text-coffee/60 text-base mb-6 max-w-xs mx-auto leading-relaxed font-bold">
            Time for a Challenge!
          </p>
        </>
      )}

      <div className="w-full space-y-3">
        {totalCards > 0 ? (
          <div className="w-full p-5 bg-cream rounded-4xl shadow-[6px_6px_0px_0px_rgba(93,64,55,0.2)] border-4 border-coffee mb-2 relative overflow-hidden text-left">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-salmon text-white border-2 border-coffee rounded-lg shadow-sm">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-coffee font-rounded text-base leading-none">Ready to Study</div>
                  <div className="text-[10px] text-coffee/60 flex items-center gap-1.5 font-bold mt-1">
                    <span className="text-salmon">{cardCountZh} Chinese</span>
                    <span className="w-1 h-1 rounded-full bg-coffee/20"></span>
                    <span className="text-indigo-500">{cardCountEn} English</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onStart('zh')}
                className="w-full py-3 bg-salmon text-white rounded-2xl font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex flex-col items-center justify-center leading-tight"
              >
                <span className="text-lg">中文</span>
                <span className="text-[10px] opacity-90 font-bold uppercase tracking-wider">Chinese</span>
              </button>

              <button
                onClick={() => onStart('en')}
                className="w-full py-3 bg-indigo-500 text-white rounded-2xl font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex flex-col items-center justify-center leading-tight"
              >
                <span className="text-lg font-serif">Aa</span>
                <span className="text-[10px] opacity-90 font-bold uppercase tracking-wider">English</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full p-6 bg-white rounded-4xl shadow-[6px_6px_0px_0px_rgba(93,64,55,1)] border-4 border-coffee mb-2 flex flex-col items-center text-center relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
            <div className="absolute top-0 left-0 w-full h-full bg-cream opacity-50 pointer-events-none"></div>

            {/* Decorative Background */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yolk/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-salmon/10 rounded-full blur-2xl animate-pulse delay-700"></div>

            <div className="relative z-10 w-full">
              <h3 className="text-2xl font-black text-coffee mb-2">Start Your Journey!</h3>
              <p className="text-coffee/70 font-bold text-sm mb-8 max-w-[200px] mx-auto leading-relaxed">
                Your deck is empty. Add your first words to begin learning.
              </p>

              <button
                onClick={onManage}
                className="w-full py-4 bg-salmon text-white rounded-2xl font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,0.4)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,0.4)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 group-hover:bg-salmon/90"
              >
                <Plus className="w-6 h-6 stroke-[4]" />
                Add New Words
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes indeterminate-bar {
            0% { left: -35%; width: 30%; }
            60% { left: 100%; width: 100%; }
            100% { left: 100%; width: 100%; }
        }
        .animate-indeterminate-bar {
            position: absolute;
            animation: indeterminate-bar 2s infinite linear;
        }
      `}</style>
    </div>
  );
};