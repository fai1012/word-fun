import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../services/i18nService';

export const TOUR_STORAGE_KEY = 'word_fun_has_seen_tour';

interface TourContextType {
    hasSeenTour: boolean;
    isActive: boolean;
    startTour: () => void;
    completeTour: () => void;
    runTourForPage: (page: 'profiles' | 'home' | 'summary' | 'preferences') => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useI18n();
    const navigate = useNavigate();

    const [hasSeenTour, setHasSeenTour] = useState(() => {
        return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    });
    const [isActive, setIsActive] = useState(() => {
        // If not completed but we have it in storage, we might want to resume.
        // For simplicity, we just mark active if explicitly started or not seen.
        return localStorage.getItem(TOUR_STORAGE_KEY) !== 'true';
    });

    // We keep a ref to the current driver instance so we can destroy it if the page unmounts
    const driverRef = useRef<any>(null);

    const completeTour = useCallback(() => {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        setHasSeenTour(true);
        setIsActive(false);
        if (driverRef.current) {
            driverRef.current.destroy();
        }
    }, []);

    const startTour = useCallback(() => {
        localStorage.removeItem(TOUR_STORAGE_KEY);
        setHasSeenTour(false);
        setIsActive(true);
        navigate('/profiles');
    }, [navigate]);

    // Handle running different segments of the tour based on the active page
    const runTourForPage = useCallback((page: 'profiles' | 'home' | 'summary' | 'preferences') => {
        if (hasSeenTour || !isActive) return;

        let steps: DriveStep[] = [];
        let driverObj: any;

        if (page === 'profiles') {
            steps = [
                {
                    element: '#tour-add-profile',
                    popover: {
                        title: t('tour.profile_title') || '新增個人檔案',
                        description: t('tour.profile_desc') || '為每個孩子建立專屬的學習檔案，追蹤他們的進度。',
                        side: 'top',
                        align: 'start',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = () => {
                            setTimeout(() => {
                                if (driverObj && driverObj.hasNextStep()) driverObj.moveNext();
                            }, 300);
                        };
                        element.addEventListener('click', handler, { once: true });
                    }
                },
                {
                    element: '#tour-profile-name',
                    popover: {
                        title: t('tour.name_title') || '輸入名稱',
                        description: t('tour.name_desc') || '輸入孩子的名字，讓學習更有專屬感。',
                        side: 'top',
                        align: 'center',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = (e: Event) => {
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim().length > 0) {
                                setTimeout(() => {
                                    if (driverObj && driverObj.hasNextStep()) driverObj.moveNext();
                                }, 800);
                                element.removeEventListener('input', handler);
                            }
                        };
                        element.addEventListener('input', handler);
                    }
                },
                {
                    element: '#tour-profile-avatar',
                    popover: {
                        title: t('tour.avatar_title') || '選擇頭像',
                        description: t('tour.avatar_desc') || '點擊這裡為孩子挑選一個可愛的頭像作為代表吧！',
                        side: 'top',
                        align: 'start',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = () => {
                            if (driverObj) driverObj.destroy();
                        };
                        element.addEventListener('click', handler, { once: true });
                    }
                }
            ];
        } else if (page === 'home') {
            steps = [
                {
                    element: '#tour-home-add-words',
                    popover: {
                        title: t('tour.home_add_title') || '新增單字',
                        description: t('tour.home_add_desc') || '點擊這裡新增單字！您可以自己輸入單字，也可以從單字包中挑選適合的內容喔。',
                        side: 'top',
                        align: 'center',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTimeout(() => {
                                if (driverObj && driverObj.hasNextStep()) driverObj.moveNext();
                            }, 300);
                        };
                        element.addEventListener('click', handler, { once: true, capture: true });
                    }
                },
                {
                    element: '#tour-nav-add',
                    popover: {
                        title: t('tour.nav_add_title') || '快速新增',
                        description: t('tour.nav_add_desc') || '您也可以隨時點擊下方的「＋」按鈕來新增單字。',
                        side: 'top',
                        align: 'center',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = (e: Event) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTimeout(() => {
                                if (driverObj && driverObj.hasNextStep()) driverObj.moveNext();
                            }, 300);
                        };
                        element.addEventListener('click', handler, { once: true, capture: true });
                    }
                },
                {
                    element: '#tour-nav-stats',
                    popover: {
                        title: t('tour.nav_stats_title') || '學習統計',
                        description: t('tour.nav_stats_desc') || '想知道學習狀況嗎？點擊這裡查看詳細的統計資料！',
                        side: 'top',
                        align: 'center',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = () => {
                            if (driverObj) driverObj.destroy();
                        };
                        element.addEventListener('click', handler, { once: true });
                    }
                }
            ];
        } else if (page === 'summary') {
            steps = [
                {
                    element: '#tour-stats-overview',
                    popover: {
                        title: t('tour.stats_title') || '各項統計',
                        description: t('tour.stats_desc') || '這裡會為您仔細分析每個單字的學習狀況，讓您輕鬆掌握進度。',
                        side: 'bottom',
                        align: 'center',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        setTimeout(() => {
                            if (driverObj && driverObj.hasNextStep()) driverObj.moveNext();
                        }, 3500);
                    }
                },
                {
                    element: '#tour-nav-settings',
                    popover: {
                        title: t('nav.settings') || '設定',
                        description: t('tour.nav_settings_desc') || '點擊進入設定，您可以調整學習步調等細節。',
                        side: 'top',
                        align: 'center',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = () => {
                            if (driverObj) driverObj.destroy();
                        };
                        element.addEventListener('click', handler, { once: true });
                    }
                }
            ];
        } else if (page === 'preferences') {
            steps = [
                {
                    element: '#tour-learning-pace',
                    popover: {
                        title: t('tour.pacing_title') || '學習步調',
                        description: t('tour.pacing_desc') || '根據孩子的學習狀況，在這裡調整每次複習的單字數量，讓學習更無壓力。',
                        side: 'top',
                        align: 'start',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = () => {
                            setTimeout(() => {
                                if (driverObj && driverObj.hasNextStep()) driverObj.moveNext();
                            }, 300);
                        };
                        element.addEventListener('click', handler, { once: true });
                    }
                },
                {
                    element: '#tour-daily-limit',
                    popover: {
                        title: t('tour.limit_title') || '每日 AI 額度',
                        description: t('tour.limit_desc') || '我們為每個新單字準備了 AI 專屬的客製化例句來提升學習效果，請注意這裡有每日的生成額度限制喔！\n\n(點擊此處關閉導覽)',
                        side: 'top',
                        align: 'start',
                        showButtons: []
                    },
                    onHighlighted: (element) => {
                        if (!element) return;
                        const handler = () => {
                            if (driverObj) driverObj.destroy();
                            completeTour(); // End of tour!
                        };
                        element.addEventListener('click', handler, { once: true });
                    }
                }
            ];
        }

        if (steps.length === 0) return;

        // Destroy previous driver if it exists
        if (driverRef.current) {
            driverRef.current.destroy();
        }

        driverObj = driver({
            showProgress: true,
            animate: true,
            steps: steps,
            allowClose: false,
            overlayOpacity: 0.65,
            stagePadding: 6,
            allowKeyboardControl: false,
            popoverClass: 'word-fun-tour-popover',
            onDestroyStarted: () => {
                if (driverObj.hasNextStep()) {
                    driverObj.destroy();
                } else {
                    driverObj.destroy();
                }
            },
            onPopoverRender: (popover) => {
                if (popover.wrapper && !popover.wrapper.querySelector('.tour-panda')) {
                    const panda = document.createElement('img');
                    panda.src = 'https://gen-lang-client-0834078301.web.app/v1/tutorial_panda.png';
                    panda.className = 'tour-panda';
                    popover.wrapper.appendChild(panda);
                }

                // Attach click listener to the highlighted element to move to the next step
                const activeElement = driverObj.getActiveElement();
                if (activeElement) {
                    const handleElementClick = () => {
                        if (driverObj.hasNextStep()) {
                            driverObj.moveNext();
                        } else {
                            driverObj.destroy();
                        }
                    };

                    // We only want to attach it once per step render
                    // So we can use an inline listener for simplicity, 
                    // or addEventListener with once: true
                    activeElement.addEventListener('click', handleElementClick, { once: true });
                }
            }
        });

        driverRef.current = driverObj;

        // Small delay to ensure elements are rendered
        setTimeout(() => {
            driverObj.drive();
        }, 300);

        return () => {
            if (driverRef.current) {
                driverRef.current.destroy();
            }
        };
    }, [hasSeenTour, isActive, t, completeTour]);

    const tourStyle = `
  .driver-overlay {
    z-index: 99999 !important;
  }
  .driver-active-element {
    z-index: 100000 !important;
  }
  .word-fun-tour-popover.driver-popover {
    z-index: 100001 !important;
    background-color: #FFF9F0;
    color: #5D4037;
    border: 3px solid #5D4037;
    border-radius: 1.5rem;
    box-shadow: 4px 4px 0px 0px rgba(93, 64, 55, 0.3);
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    font-family: inherit;
    max-width: 320px;
    overflow: visible;
  }
  .word-fun-tour-popover .driver-popover-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #5D4037;
    margin-bottom: 0.5rem;
  }
  .word-fun-tour-popover .driver-popover-description {
    font-size: 0.95rem;
    font-weight: 500;
    color: #8D6E63;
    line-height: 1.5;
  }
  .word-fun-tour-popover .driver-popover-progress-text {
    font-size: 0.75rem;
    font-weight: 800;
    color: #5D4037;
    opacity: 0.4;
  }
  .word-fun-tour-popover .driver-popover-next-btn, 
  .word-fun-tour-popover .driver-popover-prev-btn {
    background-color: #FFAB91;
    color: #fff;
    border: 2px solid #5D4037;
    border-radius: 0.75rem;
    font-weight: 800;
    padding: 0.5rem 1rem;
    box-shadow: 2px 2px 0px 0px rgba(93, 64, 55, 0.4);
    text-shadow: none;
    transition: all 0.2s;
  }
  .word-fun-tour-popover .driver-popover-next-btn:active, 
  .word-fun-tour-popover .driver-popover-prev-btn:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .word-fun-tour-popover .driver-popover-next-btn:hover, 
  .word-fun-tour-popover .driver-popover-prev-btn:hover {
    background-color: #ff9a7c;
  }
  .word-fun-tour-popover .driver-popover-close-btn {
    display: none;
  }
  @keyframes floatPanda {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .tour-panda {
    position: absolute;
    top: -65px;
    left: -20px;
    width: 90px;
    height: 90px;
    object-fit: contain;
    z-index: 1000;
    filter: drop-shadow(2px 4px 0px rgba(93, 64, 55, 0.15));
    animation: floatPanda 3s ease-in-out infinite;
    pointer-events: none;
  }

  /* Force the highlighted element to be on top of the overlay clearly */
  .driver-active-element, .driver-active-element * {
    pointer-events: auto !important;
  }
`;

    return (
        <TourContext.Provider value={{ hasSeenTour, isActive, startTour, completeTour, runTourForPage }}>
            <style>{tourStyle}</style>
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};
