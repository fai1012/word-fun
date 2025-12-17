import React from 'react';
import { X, Trophy, AlertCircle, Info } from 'lucide-react';

export type MessageType = 'success' | 'error' | 'info';

interface MessageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    buttonText?: string;
    type?: MessageType;
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
    isOpen,
    onClose,
    title,
    message,
    buttonText = "Okay",
    type = 'info'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <Trophy className="w-10 h-10 stroke-[2]" />;
            case 'error':
                return <AlertCircle className="w-10 h-10 stroke-[2]" />;
            case 'info':
            default:
                return <Info className="w-10 h-10 stroke-[2]" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'success': return 'bg-yolk';
            case 'error': return 'bg-salmon';
            case 'info': return 'bg-sky-300';
        }
    };

    const getButtonBg = () => {
        switch (type) {
            case 'success': return 'bg-salmon hover:bg-salmon/90';
            case 'error': return 'bg-coffee hover:bg-coffee/90';
            case 'info': return 'bg-sky-500 hover:bg-sky-600';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        <div className={`absolute inset-0 ${type === 'success' ? 'bg-yellow-200' : type === 'error' ? 'bg-red-200' : 'bg-blue-200'} rounded-full blur-lg opacity-60 animate-pulse`}></div>
                        <div className={`relative ${getIconBg()} text-coffee p-4 rounded-full border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,1)] transform -rotate-6`}>
                            {getIcon()}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-black text-coffee mb-4 font-rounded">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-lg text-coffee/80 font-medium leading-relaxed mb-8 px-4 whitespace-pre-wrap">
                        {message}
                    </p>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className={`w-full py-4 ${getButtonBg()} text-white rounded-2xl font-black text-lg border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(93,64,55,0.2)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all`}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};
