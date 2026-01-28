import React from 'react';
import { Volume2, VolumeX, Settings, Target, Layers, Minus, Plus, AlertTriangle, Globe, Zap } from 'lucide-react';
import { getEnv } from '../constants';
import { useI18n } from '../services/i18nService';
import { LearningPace } from '../services/learningPaceConfig';

interface PreferencesScreenProps {
    autoPlaySound: boolean;
    onToggleAutoPlaySound: (value: boolean) => void;
    masteryThreshold: number;
    onUpdateMasteryThreshold: (value: number) => void;
    learningBatchSize: number;
    onUpdateLearningBatchSize: (value: number) => void;
    learningPenalty: number;
    onUpdateLearningPenalty: (value: number) => void;
    learningPace: LearningPace;
    onUpdateLearningPace: (value: LearningPace) => void;
    onLogout: () => void;
}

export const PreferencesScreen: React.FC<PreferencesScreenProps> = ({
    autoPlaySound,
    onToggleAutoPlaySound,
    masteryThreshold,
    onUpdateMasteryThreshold,
    learningBatchSize,
    onUpdateLearningBatchSize,
    learningPenalty,
    onUpdateLearningPenalty,
    learningPace,
    onUpdateLearningPace,
    onLogout
}) => {
    const { t, setLanguage, language } = useI18n();

    const handleBatchSizeChange = (newValue: number) => {
        const clamped = Math.max(5, Math.min(30, newValue));
        onUpdateLearningBatchSize(clamped);
    };

    const handleMasteryThresholdChange = (newValue: number) => {
        const clamped = Math.max(5, Math.min(10, newValue));
        onUpdateMasteryThreshold(clamped);
    };

    const handlePenaltyChange = (newValue: number) => {
        const clamped = Math.max(1, Math.min(5, newValue));
        onUpdateLearningPenalty(clamped);
    };

    return (
        <div className="w-full max-w-lg mx-auto px-4 pb-24 pt-8 font-rounded text-coffee">
            <h1 className="text-2xl font-bold text-coffee mb-6 flex items-center gap-2">
                <Settings className="w-7 h-7 text-coffee stroke-[3]" />
                <span className="tracking-tight">{t('settings.title')}</span>
            </h1>

            <div className="space-y-6">

                {/* Audio Setting */}
                <div className="bg-white rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee overflow-hidden">
                    <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl border-2 border-coffee/10 ${autoPlaySound ? 'bg-salmon/10 text-salmon' : 'bg-coffee/5 text-coffee/40'}`}>
                                {autoPlaySound ? <Volume2 className="w-6 h-6 stroke-[3]" /> : <VolumeX className="w-6 h-6 stroke-[3]" />}
                            </div>
                            <div>
                                <div className="font-bold text-coffee text-lg">{t('settings.audio_play')}</div>
                                <div className="text-xs font-bold text-coffee/50">{t('settings.audio_play_desc')}</div>
                            </div>
                        </div>

                        <button
                            onClick={() => onToggleAutoPlaySound(!autoPlaySound)}
                            className={`relative w-14 h-8 rounded-full transition-colors duration-200 ease-in-out focus:outline-none border-2 border-coffee ${autoPlaySound ? 'bg-salmon' : 'bg-coffee/20'
                                }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full shadow-sm border-2 border-coffee transform transition-transform duration-200 ease-in-out ${autoPlaySound ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Learning Pace Setting */}
                <div className="bg-white rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee overflow-hidden p-5">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="p-3 rounded-2xl bg-salmon/10 text-salmon border-2 border-salmon/20">
                            <Zap className="w-6 h-6 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-coffee text-lg leading-tight">{t('settings.learning_pace')}</div>
                            <div className="text-xs font-bold text-coffee/40">{t('settings.learning_pace_desc')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {(['gentle', 'standard', 'challenge'] as LearningPace[]).map((pace) => {
                            const isSelected = learningPace === pace;
                            const paceColors = {
                                gentle: 'bg-matcha text-white border-matcha-dark',
                                standard: 'bg-indigo-500 text-white border-indigo-600',
                                challenge: 'bg-salmon text-white border-salmon-dark'
                            };

                            return (
                                <button
                                    key={pace}
                                    onClick={() => onUpdateLearningPace(pace)}
                                    className={`relative py-4 px-2 rounded-2xl font-bold transition-all duration-200 border-2 active:translate-y-0.5 active:shadow-none ${isSelected
                                        ? 'bg-coffee text-white border-coffee shadow-[0px_2px_0px_0px_rgba(0,0,0,0.2)]'
                                        : 'bg-white text-coffee border-coffee/10 hover:border-coffee/30 hover:bg-coffee/5'
                                        }`}
                                >
                                    <div className="text-sm tracking-tight">{t(`settings.pace_${pace}`)}</div>
                                    <div className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isSelected ? 'opacity-60' : 'opacity-30'}`}>
                                        {t(`settings.pace_${pace}_desc`)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Language Selection */}
                <div className="bg-white rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee overflow-hidden p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 border-2 border-blue-200">
                            <Globe className="w-6 h-6 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-coffee text-lg">{t('settings.language')}</div>
                            <div className="text-xs font-bold text-coffee/50">{t('settings.language_desc')}</div>
                        </div>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="p-2 bg-white text-coffee rounded-xl shadow-sm border-2 border-coffee/10 focus:outline-none focus:border-blue-200 transition-colors font-bold"
                        >
                            <option value="en">English</option>
                            <option value="zh_TW">繁體中文</option>
                        </select>
                    </div>
                </div>

                {/* Logout Button */}
                <div className="pt-4">
                    <button
                        onClick={onLogout}
                        className="w-full py-4 bg-coffee/10 text-coffee/60 rounded-2xl font-bold text-lg hover:bg-slate-200 hover:text-coffee transition-colors border-2 border-transparent hover:border-coffee/10"
                    >
                        {t('settings.logout')}
                    </button>
                </div>

            </div>

            <div className="mt-8 text-center">
                <p className="text-xs font-bold text-coffee/30">
                    {t('settings.version', [getEnv('VITE_APP_VERSION') || 'v1.0.0'])}
                </p>
            </div>
        </div>
    );
};