import React from 'react';
import { X, Trophy } from 'lucide-react';

interface CooldownDialogProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

export const CooldownDialog: React.FC<CooldownDialogProps> = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-coffee/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Dialog Card */}
            <div className="relative w-full max-w-md bg-cream border-4 border-coffee rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(93,64,55,0.3)] transform transition-all animate-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-coffee/50 hover:text-salmon hover:bg-salmon/10 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 stroke-[3]" />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center pt-4 pb-2">
                    {/* Icon */}
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-yellow-200 rounded-full blur-lg opacity-60 animate-pulse"></div>
                        <div className="relative bg-yolk text-coffee p-4 rounded-full border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] transform -rotate-6">
                            <Trophy className="w-10 h-10 stroke-[2]" />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-black text-coffee mb-4 font-rounded">
                        Great Job!
                    </h3>

                    {/* Message */}
                    <p className="text-lg text-coffee/80 font-medium leading-relaxed mb-8 px-4">
                        {message}
                    </p>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-salmon text-white rounded-2xl font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,0.2)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                        Okay, I'll be back!
                    </button>
                </div>
            </div>
        </div>
    );
};
