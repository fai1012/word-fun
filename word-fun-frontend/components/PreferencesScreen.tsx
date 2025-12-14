import React from 'react';
import { Volume2, VolumeX, Settings, Target, Layers, Minus, Plus, AlertTriangle } from 'lucide-react';
import { getEnv } from '../constants';

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
        <div className="w-full max-w-lg mx-auto px-4 pb-24 pt-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-700" />
                Settings
            </h1>

            <div className="space-y-4">

                {/* Audio Setting */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${autoPlaySound ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                {autoPlaySound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">Auto-play Audio</div>
                                <div className="text-xs text-slate-500">Play pronunciation on flip</div>
                            </div>
                        </div>

                        <button
                            onClick={() => onToggleAutoPlaySound(!autoPlaySound)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${autoPlaySound ? 'bg-rose-500' : 'bg-slate-200'
                                }`}
                        >
                            <span
                                className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ease-in-out ${autoPlaySound ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Learning Batch Size Setting */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-slate-800 text-sm">Learning Batch Size</div>
                            <div className="text-xs text-slate-500">Active words per session (excl. reviews)</div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                            <button
                                onClick={() => handleBatchSizeChange(learningBatchSize - 1)}
                                className="p-1.5 bg-white text-slate-500 hover:text-blue-600 rounded-md shadow-sm border border-slate-200 disabled:opacity-50"
                                disabled={learningBatchSize <= 5}
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="font-mono font-bold text-slate-700 text-lg w-8 text-center">
                                {learningBatchSize}
                            </div>
                            <button
                                onClick={() => handleBatchSizeChange(learningBatchSize + 1)}
                                className="p-1.5 bg-white text-slate-500 hover:text-blue-600 rounded-md shadow-sm border border-slate-200 disabled:opacity-50"
                                disabled={learningBatchSize >= 30}
                            >
                                <Plus className="w-3.5 h-3.5" />
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
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>5 Cards</span>
                        <span>30 Cards</span>
                    </div>
                </div>

                {/* Mastery Threshold Setting */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">
                            <Target className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-slate-800 text-sm">Mastery Goal</div>
                            <div className="text-xs text-slate-500">Correct answers needed to master</div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                            <button
                                onClick={() => handleMasteryThresholdChange(masteryThreshold - 1)}
                                className="p-1.5 bg-white text-slate-500 hover:text-green-600 rounded-md shadow-sm border border-slate-200 disabled:opacity-50"
                                disabled={masteryThreshold <= 5}
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="font-mono font-bold text-slate-700 text-lg w-8 text-center">
                                {masteryThreshold}
                            </div>
                            <button
                                onClick={() => handleMasteryThresholdChange(masteryThreshold + 1)}
                                className="p-1.5 bg-white text-slate-500 hover:text-green-600 rounded-md shadow-sm border border-slate-200 disabled:opacity-50"
                                disabled={masteryThreshold >= 10}
                            >
                                <Plus className="w-3.5 h-3.5" />
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
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>5 Correct</span>
                        <span>10 Correct</span>
                    </div>
                </div>

                {/* Learning Penalty Setting */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-slate-800 text-sm">Mistake Penalty</div>
                            <div className="text-xs text-slate-500">Points lost when answering incorrectly</div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                            <button
                                onClick={() => handlePenaltyChange(learningPenalty - 1)}
                                className="p-1.5 bg-white text-slate-500 hover:text-orange-600 rounded-md shadow-sm border border-slate-200 disabled:opacity-50"
                                disabled={learningPenalty <= 1}
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="font-mono font-bold text-slate-700 text-lg w-8 text-center">
                                {learningPenalty}
                            </div>
                            <button
                                onClick={() => handlePenaltyChange(learningPenalty + 1)}
                                className="p-1.5 bg-white text-slate-500 hover:text-orange-600 rounded-md shadow-sm border border-slate-200 disabled:opacity-50"
                                disabled={learningPenalty >= 5}
                            >
                                <Plus className="w-3.5 h-3.5" />
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
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>-1 Point</span>
                        <span>-5 Points</span>
                    </div>
                </div>

                {/* Logout Button */}
                <div className="pt-4">
                    <button
                        onClick={onLogout}
                        className="w-full py-3 bg-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>

            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400">
                    認字繽紛樂 {getEnv('VITE_APP_VERSION') || 'v1.0.0'}
                </p>
            </div>
        </div>
    );
};