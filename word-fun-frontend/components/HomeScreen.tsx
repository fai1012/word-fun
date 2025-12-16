import React from 'react';
import { Layers } from 'lucide-react';
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
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  cardCountZh,
  cardCountEn,
  onStart,
  onManage,
  profileName,
  avatarId,
  masteredCount,
  reviewedCount
}) => {
  const totalCards = cardCountZh + cardCountEn;
  const avatarSrc = avatarId ? AVATAR_MAP[avatarId] : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 w-full max-w-lg mx-auto text-center">

      {/* Application Logo / Avatar */}
      <div className="mb-10 relative group cursor-default">
        {/* Glow effect */}
        <div className={`absolute -inset-3 bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-500 blur-xl opacity-30 ${!avatarSrc ? 'rounded-[2.5rem] group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse' : 'rounded-full'}`}></div>

        {/* Main Container */}
        <div className={`relative w-32 h-32 bg-gradient-to-br from-blue-600 via-purple-600 to-rose-500 shadow-2xl flex items-center justify-center border-[4px] border-white/10 ${!avatarSrc && !profileName ? 'rounded-[2rem] transform transition-transform group-hover:scale-105 group-hover:rotate-2' : 'rounded-full'} ${avatarSrc || profileName ? 'overflow-hidden' : ''} ${!avatarSrc && profileName ? 'bg-rose-100' : ''}`}>

          {avatarSrc ? (
            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
          ) : profileName ? (
            <div className="w-full h-full bg-rose-100 flex items-center justify-center">
              <span className="text-6xl font-bold text-rose-500">
                {profileName.substring(0, 1).toUpperCase()}
              </span>
            </div>
          ) : (
            <>
              {/* Glossy top shine (Logo only) */}
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-[1.7rem] pointer-events-none"></div>

              {/* Inner ring (Logo only) */}
              <div className="absolute inset-1 border border-white/20 rounded-[1.8rem] pointer-events-none"></div>

              {/* The Character */}
              <span
                className="text-7xl text-white drop-shadow-lg select-none pb-2 pl-1"
                style={{ fontFamily: "'Zhi Mang Xing', cursive" }}
              >
                認
              </span>
            </>
          )}
        </div>
      </div>

      {profileName && (
        <h1 className="text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">
          Hi, {profileName}!
        </h1>
      )}

      {reviewedCount > 0 ? (
        <>
          <h2 className="text-xl font-bold text-slate-700 mb-2 px-2 leading-relaxed">
            You have reviewed <span className="text-rose-500 text-2xl mx-1">{reviewedCount}</span> words
            and mastered <span className="text-indigo-500 text-2xl mx-1">{masteredCount}</span> words!
          </h2>
          <p className="text-slate-500 text-lg mb-10 font-medium">Keep going!</p>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-extrabold text-slate-800 mb-2 tracking-tight">
            Haven't started yet?
          </h1>
          <p className="text-slate-500 text-lg mb-10 max-w-xs mx-auto leading-relaxed">
            Challenge today
          </p>
        </>
      )}

      <div className="w-full space-y-4">
        {totalCards > 0 ? (
          <div className="w-full p-6 bg-cream rounded-4xl shadow-[6px_6px_0px_0px_rgba(93,64,55,0.2)] border-4 border-coffee mb-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-salmon text-white border-2 border-coffee rounded-xl shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-coffee font-rounded text-lg">Ready to Study</div>
                  <div className="text-xs text-coffee/60 flex items-center gap-2 font-bold">
                    <span className="text-salmon">{cardCountZh} Chinese</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-coffee/20"></span>
                    <span className="text-indigo-500">{cardCountEn} English</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onStart('zh')}
                className="w-full py-4 bg-salmon text-white rounded-3xl font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg">中文</span>
                <span className="text-sm opacity-90 font-bold">Start Chinese</span>
              </button>

              <button
                onClick={() => onStart('en')}
                className="w-full py-4 bg-indigo-500 text-white rounded-3xl font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg font-serif">Aa</span>
                <span className="text-sm opacity-90 font-bold">Start English</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-2xl p-6 mb-6 border border-slate-200 border-dashed">
            <p className="text-slate-500 mb-4">No cards loaded yet.</p>
            <button
              onClick={onManage}
              className="text-rose-600 font-semibold hover:text-rose-700 flex items-center justify-center gap-2 mx-auto"
            >
              Add new words to start →
            </button>
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