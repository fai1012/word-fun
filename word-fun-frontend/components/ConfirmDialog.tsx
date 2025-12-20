import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-coffee/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            ></div>

            {/* Dialog Card */}
            <div className="relative w-full max-w-sm bg-cream border-4 border-coffee rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(93,64,55,0.3)] transform transition-all animate-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-coffee/50 hover:text-salmon hover:bg-salmon/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 stroke-[3]" />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center pt-2">
                    {/* Icon */}
                    <div className="mb-4 p-4 bg-salmon/10 text-salmon rounded-full border-2 border-salmon/20">
                        <AlertCircle className="w-8 h-8 stroke-[2.5]" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-coffee mb-3 font-rounded">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-sm text-coffee/70 font-bold leading-relaxed mb-8 px-2">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-white text-coffee font-black text-sm rounded-xl border-2 border-coffee/10 hover:bg-coffee/5 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-3 text-white font-black text-sm rounded-xl border-2 border-coffee shadow-[2px_2px_0px_0px_rgba(93,64,55,0.2)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all ${isDestructive
                                    ? 'bg-salmon'
                                    : 'bg-matcha'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
