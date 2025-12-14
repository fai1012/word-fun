import React from 'react';
import { X } from 'lucide-react';

// Import all 16 avatars directly
import avatar01 from '../assets/avaters01.png';
import avatar02 from '../assets/avaters02.png';
import avatar03 from '../assets/avaters03.png';
import avatar04 from '../assets/avaters04.png';
import avatar05 from '../assets/avaters05.png';
import avatar06 from '../assets/avaters06.png';
import avatar07 from '../assets/avaters07.png';
import avatar08 from '../assets/avaters08.png';
import avatar09 from '../assets/avaters09.png';
import avatar10 from '../assets/avaters10.png';
import avatar11 from '../assets/avaters11.png';
import avatar12 from '../assets/avaters12.png';
import avatar13 from '../assets/avaters13.png';
import avatar14 from '../assets/avaters14.png';
import avatar15 from '../assets/avaters15.png';
import avatar16 from '../assets/avaters16.png';

// Create a map for easy access
export const AVATAR_MAP: Record<string, string> = {
    'avatar-01': avatar01,
    'avatar-02': avatar02,
    'avatar-03': avatar03,
    'avatar-04': avatar04,
    'avatar-05': avatar05,
    'avatar-06': avatar06,
    'avatar-07': avatar07,
    'avatar-08': avatar08,
    'avatar-09': avatar09,
    'avatar-10': avatar10,
    'avatar-11': avatar11,
    'avatar-12': avatar12,
    'avatar-13': avatar13,
    'avatar-14': avatar14,
    'avatar-15': avatar15,
    'avatar-16': avatar16,
};

interface AvatarPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (avatarId: string) => void;
    currentAvatarId?: string;
    displayName?: string;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ isOpen, onClose, onSelect, currentAvatarId, displayName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">Choose an Avatar</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
                    {/* Option: Use Name Initial */}
                    <button
                        align-item="center"
                        onClick={() => onSelect('')}
                        className={`aspect-square rounded-full relative overflow-hidden transition-all flex items-center justify-center bg-rose-100 text-rose-500 font-bold text-2xl ${(!currentAvatarId || !AVATAR_MAP[currentAvatarId]) ? 'ring-4 ring-rose-500 ring-offset-2' : 'hover:scale-110 hover:shadow-lg'}`}
                    >
                        {displayName ? displayName.substring(0, 1).toUpperCase() : '?'}
                    </button>

                    {Object.entries(AVATAR_MAP).map(([id, src]) => {
                        const isSelected = currentAvatarId === id;
                        return (
                            <button
                                key={id}
                                onClick={() => onSelect(id)}
                                className={`aspect-square rounded-full relative overflow-hidden transition-all ${isSelected ? 'ring-4 ring-rose-500 ring-offset-2' : 'hover:scale-110 hover:shadow-lg'}`}
                            >
                                <img src={src} alt="Avatar" className="w-full h-full object-cover" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
