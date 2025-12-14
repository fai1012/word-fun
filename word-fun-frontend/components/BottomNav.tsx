import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, BarChart3, Settings, User, Users } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Profile } from '../types';

interface BottomNavProps {
  profileName?: string;
  profiles?: Profile[];
  currentProfileId?: string;
  onProfileSelect?: (profile: Profile) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ profileName, profiles, currentProfileId, onProfileSelect }) => {
  const location = useLocation();
  const { profileId } = useParams();
  const currentPath = location.pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine active tab based on path
  const isStudy = currentPath.includes('/study');
  const isStats = currentPath.includes('/stats');
  const isSettings = currentPath.includes('/settings');

  const getPath = (suffix: string) => {
    if (profileId) {
      return `/profiles/${profileId}${suffix}`;
    }
    return suffix;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 pb-safe pt-1 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
      <div className="flex justify-between items-center max-w-md mx-auto h-16 px-2 relative">

        <Link
          to={getPath('/study')}
          className={`flex flex-col items-center gap-1 w-16 transition-colors ${isStudy ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <BookOpen className={`w-6 h-6 ${isStudy ? 'fill-rose-100' : ''}`} />
          <span className="text-[10px] font-bold tracking-wide">Study</span>
        </Link>

        <Link
          to={getPath('/stats')}
          className={`flex flex-col items-center gap-1 w-16 transition-colors ${isStats ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <BarChart3 className={`w-6 h-6 ${isStats ? 'fill-rose-100' : ''}`} />
          <span className="text-[10px] font-bold tracking-wide">Stats</span>
        </Link>

        {/* ADD WORDS BUTTON */}
        <Link
          to={getPath('/add')}
          className="flex flex-col items-center justify-center -mt-6 w-14 h-14 bg-rose-500 rounded-full shadow-lg shadow-rose-200 text-white hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>

        <Link
          to={getPath('/settings')}
          className={`flex flex-col items-center gap-1 w-16 transition-colors ${isSettings ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          <Settings className={`w-6 h-6 ${isSettings ? 'fill-rose-100' : ''}`} />
          <span className="text-[10px] font-bold tracking-wide">Settings</span>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          {isMenuOpen && (
            <div className="absolute bottom-full right-0 mb-3 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col max-h-80">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Switch Profile</div>
              </div>

              <div className="overflow-y-auto flex-1">
                {profiles?.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      if (onProfileSelect) {
                        onProfileSelect(profile);
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${currentProfileId === profile.id ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-700 font-medium'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${currentProfileId === profile.id ? 'bg-rose-200 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>
                      {profile.displayName.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate">{profile.displayName}</span>
                  </button>
                ))}
              </div>

              <Link
                to="/profiles"
                onClick={() => setIsMenuOpen(false)}
                className="w-full px-4 py-3 text-left text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 border-t border-slate-100 shrink-0 uppercase tracking-wide justify-center"
              >
                <Settings className="w-3 h-3" />
                Manage Profiles
              </Link>
            </div>
          )}

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${isMenuOpen ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden border ${isMenuOpen ? 'border-rose-200 bg-rose-50' : 'border-slate-300 bg-slate-200'}`}>
              <User className={`w-4 h-4 ${isMenuOpen ? 'text-rose-500' : 'text-slate-500'}`} />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Profile</span>
          </button>
        </div>

      </div>
      <div className="h-[env(safe-area-inset-bottom)]"></div>
    </div>
  );
};