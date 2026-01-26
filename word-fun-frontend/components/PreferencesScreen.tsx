import React from 'react';
import { Volume2, VolumeX, Settings, Target, Layers, Minus, Plus, AlertTriangle, Globe } from 'lucide-react';
import { getEnv } from '../constants';
import { useI18n } from '../services/i18nService';

interface PreferencesScreenProps {
    autoPlaySound: boolean;
    onToggleAutoPlaySound: (value: boolean) => void;
    masteryThreshold: number;
    onUpdateMasteryThreshold: (value: number) => void;
    learningBatchSize: number;
    onUpdateLearningBatchSize: (value: number) => void;
    learningPenalty: number;
    onUpdateLearningPenalty: (value: number) => void;
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

                {/* Learning Batch Size Setting */}
                <div className="bg-white rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee overflow-hidden p-5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600 border-2 border-indigo-200">
                            <Layers className="w-6 h-6 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-coffee text-lg">{t('settings.batch_size')}</div>
                            <div className="text-xs font-bold text-coffee/50">{t('settings.batch_size_desc')}</div>
                        </div>

                        <div className="flex items-center gap-3 bg-coffee/5 p-1.5 rounded-2xl border border-coffee/10">
                            <button
                                onClick={() => handleBatchSizeChange(learningBatchSize - 1)}
                                className="p-2 bg-white text-coffee hover:text-indigo-600 rounded-xl shadow-sm border-2 border-coffee/10 disabled:opacity-50 disabled:shadow-none hover:border-indigo-200 transition-colors"
                                disabled={learningBatchSize <= 5}
                            >
                                <Minus className="w-4 h-4 stroke-[3]" />
                            </button>
                            <div className="font-mono font-bold text-coffee text-xl w-8 text-center">
                                {learningBatchSize}
                            </div>
                            <button
                                onClick={() => handleBatchSizeChange(learningBatchSize + 1)}
                                className="p-2 bg-white text-coffee hover:text-indigo-600 rounded-xl shadow-sm border-2 border-coffee/10 disabled:opacity-50 disabled:shadow-none hover:border-indigo-200 transition-colors"
                                disabled={learningBatchSize >= 30}
                            >
                                <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={learningBatchSize}
                        onChange={(e) => handleBatchSizeChange(parseInt(e.target.value))}
                        className="w-full h-4 bg-coffee/10 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-coffee/40 mt-2 uppercase tracking-wider">
                        <span>{t('home.lang_en', [5])}</span>
                        <span>{t('home.lang_en', [30])}</span>
                    </div>
                </div>

                {/* Mastery Threshold Setting */}
                <div className="bg-white rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee overflow-hidden p-5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-matcha/20 text-matcha border-2 border-matcha/30">
                            <Target className="w-6 h-6 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-coffee text-lg">{t('settings.mastery_goal')}</div>
                            <div className="text-xs font-bold text-coffee/50">{t('settings.mastery_goal_desc')}</div>
                        </div>

                        <div className="flex items-center gap-3 bg-coffee/5 p-1.5 rounded-2xl border border-coffee/10">
                            <button
                                onClick={() => handleMasteryThresholdChange(masteryThreshold - 1)}
                                className="p-2 bg-white text-coffee hover:text-matcha rounded-xl shadow-sm border-2 border-coffee/10 disabled:opacity-50 disabled:shadow-none hover:border-matcha/50 transition-colors"
                                disabled={masteryThreshold <= 5}
                            >
                                <Minus className="w-4 h-4 stroke-[3]" />
                            </button>
                            <div className="font-mono font-bold text-coffee text-xl w-8 text-center">
                                {masteryThreshold}
                            </div>
                            <button
                                onClick={() => handleMasteryThresholdChange(masteryThreshold + 1)}
                                className="p-2 bg-white text-coffee hover:text-matcha rounded-xl shadow-sm border-2 border-coffee/10 disabled:opacity-50 disabled:shadow-none hover:border-matcha/50 transition-colors"
                                disabled={masteryThreshold >= 10}
                            >
                                <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="10"
                        step="1"
                        value={masteryThreshold}
                        onChange={(e) => handleMasteryThresholdChange(parseInt(e.target.value))}
                        className="w-full h-4 bg-coffee/10 rounded-full appearance-none cursor-pointer accent-matcha hover:accent-matcha/80"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-coffee/40 mt-2 uppercase tracking-wider">
                        <span>{t('study.correct_count', [5])}</span>
                        <span>{t('study.correct_count', [10])}</span>
                    </div>
                </div>

                {/* Learning Penalty Setting */}
                <div className="bg-white rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee overflow-hidden p-5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-2xl bg-yolk/20 text-yolk border-2 border-yolk/30">
                            <AlertTriangle className="w-6 h-6 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-coffee text-lg">{t('settings.penalty')}</div>
                            <div className="text-xs font-bold text-coffee/50">{t('settings.penalty_desc')}</div>
                        </div>

                        <div className="flex items-center gap-3 bg-coffee/5 p-1.5 rounded-2xl border border-coffee/10">
                            <button
                                onClick={() => handlePenaltyChange(learningPenalty - 1)}
                                className="p-2 bg-white text-coffee hover:text-yolk rounded-xl shadow-sm border-2 border-coffee/10 disabled:opacity-50 disabled:shadow-none hover:border-yolk/50 transition-colors"
                                disabled={learningPenalty <= 1}
                            >
                                <Minus className="w-4 h-4 stroke-[3]" />
                            </button>
                            <div className="font-mono font-bold text-coffee text-xl w-8 text-center">
                                {learningPenalty}
                            </div>
                            <button
                                onClick={() => handlePenaltyChange(learningPenalty + 1)}
                                className="p-2 bg-white text-coffee hover:text-yolk rounded-xl shadow-sm border-2 border-coffee/10 disabled:opacity-50 disabled:shadow-none hover:border-yolk/50 transition-colors"
                                disabled={learningPenalty >= 5}
                            >
                                <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={learningPenalty}
                        onChange={(e) => handlePenaltyChange(parseInt(e.target.value))}
                        className="w-full h-4 bg-coffee/10 rounded-full appearance-none cursor-pointer accent-yolk hover:accent-yolk/80"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-coffee/40 mt-2 uppercase tracking-wider">
                        <span>{t('study.penalty_points', [1])}</span>
                        <span>{t('study.penalty_points', [5])}</span>
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