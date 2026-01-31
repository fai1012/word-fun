import React, { useState, useEffect } from 'react';
import { Share, X, Download } from 'lucide-react';
import { useI18n } from '../services/i18nService';

export const PWAInstallPrompt: React.FC = () => {
    const { t } = useI18n();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

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
        <div className="bg-white/90 backdrop-blur-sm border-b-4 border-coffee/20 p-4 sticky top-0 z-50 animate-in fade-in slide-in-from-top-2 duration-500 shadow-lg">
            <div className="max-w-md mx-auto flex items-start gap-4">
                <div className="bg-cream border-2 border-coffee rounded-xl p-2 shrink-0">
                    <img
                        src="https://gen-lang-client-0834078301.web.app/assets_panda-fav_favicon-200x200.png"
                        alt="Icon"
                        className="w-10 h-10 object-contain"
                    />
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="text-coffee font-bold text-lg leading-tight mb-1">
                            {t('pwa.install_title')}
                        </h3>
                        <button
                            onClick={handleDismiss}
                            className="text-mocha hover:text-coffee transition-colors -mt-1 -mr-2 p-2"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-coffee/80 text-sm mb-3 font-medium">
                        {t('pwa.install_desc')}
                    </p>

                    {isIOS ? (
                        <div className="bg-cream/50 rounded-lg p-3 text-sm border-2 border-dashed border-coffee/10">
                            <p className="flex items-center gap-2 text-coffee font-bold mb-1">
                                <Share size={16} className="text-salmon" />
                                1. {t('pwa.tap_share')}
                            </p>
                            <p className="flex items-center gap-2 text-coffee font-bold">
                                <span className="w-4 h-4 rounded bg-coffee/10 flex items-center justify-center text-[10px] border border-coffee/20">+</span>
                                2. {t('pwa.add_to_home')}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={handleInstallClick}
                            className="bg-salmon text-white font-bold py-2 px-6 rounded-full shadow-[0_2px_0_0_#D84315] active:shadow-none active:translate-y-[2px] w-full flex items-center justify-center gap-2 transition-all"
                        >
                            <Download size={18} />
                            {t('pwa.install_app')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
