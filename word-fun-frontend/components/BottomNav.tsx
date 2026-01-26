import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, BarChart3, Settings, User, Users } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Profile } from '../types';
import { useI18n } from '../services/i18nService';

interface BottomNavProps {
  profileName?: string;
  profiles?: Profile[];
  currentProfileId?: string;
  onProfileSelect?: (profile: Profile) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ profileName, profiles, currentProfileId, onProfileSelect }) => {
  const { t } = useI18n();
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
    <div className="fixed bottom-0 left-0 w-full bg-cream border-t-2 border-coffee/10 pb-safe pt-1 px-2 shadow-[0_-4px_6px_-1px_rgba(93,64,55,0.05)] z-40">
      <div className="flex justify-between items-center max-w-md mx-auto h-16 px-2 relative">

        <Link
          to={getPath('/study')}
          className={`flex flex-col items-center gap-1 w-16 transition-colors ${isStudy ? 'text-salmon font-bold' : 'text-coffee/40 hover:text-coffee/70'
            }`}
        >
          <BookOpen className={`w-6 h-6 ${isStudy ? 'fill-salmon/20 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-wide font-rounded">{t('nav.study')}</span>
        </Link>

        <Link
          to={getPath('/stats')}
          className={`flex flex-col items-center gap-1 w-16 transition-colors ${isStats ? 'text-salmon font-bold' : 'text-coffee/40 hover:text-coffee/70'
            }`}
        >
          <BarChart3 className={`w-6 h-6 ${isStats ? 'fill-salmon/20 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-wide font-rounded">{t('nav.stats')}</span>
        </Link>

        {/* ADD WORDS BUTTON */}
        <Link
          to={getPath('/add')}
          className="flex flex-col items-center justify-center -mt-8 w-16 h-16 bg-salmon rounded-full border-4 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] text-white hover:bg-salmon hover:scale-105 active:scale-95 active:shadow-none active:translate-y-1 transition-all z-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 drop-shadow-sm">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>

        <Link
          to={getPath('/settings')}
          className={`flex flex-col items-center gap-1 w-16 transition-colors ${isSettings ? 'text-salmon font-bold' : 'text-coffee/40 hover:text-coffee/70'
            }`}
        >
          <Settings className={`w-6 h-6 ${isSettings ? 'fill-salmon/20 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-wide font-rounded">{t('nav.settings')}</span>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          {isMenuOpen && (
            <div className="absolute bottom-full right-0 mb-4 w-64 bg-cream rounded-2xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col max-h-80">
              <div className="px-4 py-3 bg-coffee/5 border-b-2 border-coffee/10 shrink-0">
                <div className="text-xs text-coffee/60 font-bold uppercase tracking-wider font-rounded">{t('nav.switch_profile')}</div>
              </div>

              <div className="overflow-y-auto flex-1">
                {profiles?.filter(p => p && p.id).map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      if (onProfileSelect) {
                        onProfileSelect(profile);
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-white/50 transition-colors ${currentProfileId === profile.id ? 'bg-salmon/10 text-salmon font-bold' : 'text-coffee font-medium'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 border border-coffee/10 ${currentProfileId === profile.id ? 'bg-salmon text-white' : 'bg-white text-coffee/60'}`}>
                      {profile.displayName.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate">{profile.displayName}</span>
                  </button>
                ))}
              </div>

              <Link
                to="/profiles"
                onClick={() => setIsMenuOpen(false)}
                className="w-full px-4 py-3 text-left text-xs font-bold text-coffee/60 hover:text-salmon hover:bg-white/50 transition-colors flex items-center gap-2 border-t-2 border-coffee/10 shrink-0 uppercase tracking-wide justify-center"
              >
                <Settings className="w-3 h-3" />
                {t('nav.manage_profiles')}
              </Link>
            </div>
          )}

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${isMenuOpen ? 'text-salmon font-bold' : 'text-coffee/40 hover:text-coffee/70'}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden border-2 ${isMenuOpen ? 'border-salmon bg-salmon/10' : 'border-coffee/20 bg-white'}`}>
              <User className={`w-4 h-4 ${isMenuOpen ? 'text-salmon stroke-[2.5]' : 'text-coffee/40 stroke-2'}`} />
            </div>
            <span className="text-[10px] tracking-wide font-rounded">{t('nav.profile')}</span>
          </button>
        </div>

      </div>
      <div className="h-[env(safe-area-inset-bottom)]"></div>
    </div>
  );
};