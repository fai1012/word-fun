import React, { useState, useEffect } from 'react';
import { Share, X, PlusSquare } from 'lucide-react';
import { useI18n } from '../services/i18nService';

export const PWAInstallPrompt: React.FC = () => {
    const { t } = useI18n();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMode);

        if (isStandaloneMode) return;

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Handle beforeinstallprompt for Android/Desktop
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!isIosDevice) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS, simple check if we want to show it (e.g. check if not standalone)
        if (isIosDevice && !isStandaloneMode) {
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (!isVisible || isStandalone) return null;

    return (
        <>
            <div className="bg-[#f8f9fa] border-t border-gray-200 p-4 fixed bottom-0 left-0 right-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <div className="shrink-0 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                        <img
                            src="https://gen-lang-client-0834078301.web.app/v1/assets_panda-fav_favicon-200x200.png"
                            alt="Icon"
                            className="w-10 h-10 object-contain rounded-lg"
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-bold text-[15px] leading-tight mb-0.5 truncate">
                            {t('pwa.install_title')}
                        </h3>
                        <p className="text-gray-500 text-[13px] leading-snug">
                            {t('pwa.install_desc')}
                        </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                        {isIOS ? (
                            <button
                                onClick={() => setShowIOSModal(true)}
                                className="bg-[#1f1f1f] text-white font-semibold py-2 px-4 rounded-full text-sm active:scale-95 transition-transform shrink-0"
                            >
                                {t('pwa.how_to_button')}
                            </button>
                        ) : (
                            <button
                                onClick={handleInstallClick}
                                className="bg-[#1f1f1f] text-white font-semibold py-2 px-4 rounded-full text-sm active:scale-95 transition-transform shrink-0"
                            >
                                {t('pwa.install_button')}
                            </button>
                        )}

                        <button
                            onClick={handleDismiss}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Instructions Modal */}
            {isIOS && showIOSModal && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowIOSModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 flex justify-between items-center bg-white relative">
                            <h3 className="text-gray-900 font-bold text-lg text-center w-full">{t('pwa.modal_title')}</h3>
                            <button onClick={() => setShowIOSModal(false)} className="text-gray-400 hover:text-gray-600 absolute right-4">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 pt-2">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0 flex items-center justify-center font-bold text-gray-700">1</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">{t('pwa.step1_title')}</h4>
                                    <p className="text-[13px] text-gray-500 flex items-center gap-1 flex-wrap">
                                        {t('pwa.step1_desc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0 flex items-center justify-center font-bold text-gray-700">2</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">{t('pwa.step2_title')}</h4>
                                    <p className="text-[13px] text-gray-500 flex items-center gap-1 flex-wrap">
                                        {t('pwa.step2_desc')} <PlusSquare size={14} className="text-gray-500 inline-block align-middle" />
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0 flex items-center justify-center font-bold text-gray-700">3</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">{t('pwa.step3_title')}</h4>
                                    <p className="text-[13px] text-gray-500">{t('pwa.step3_desc')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-2">
                            <button
                                onClick={() => setShowIOSModal(false)}
                                className="w-full bg-[#1f1f1f] text-white font-bold py-3.5 px-6 rounded-[20px] active:scale-95 transition-transform"
                            >
                                {t('pwa.got_it')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

