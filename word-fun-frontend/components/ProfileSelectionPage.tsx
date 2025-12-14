import React, { useState, useEffect } from 'react';
import { User as UserIcon, Plus, ChevronRight, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';
import { Profile, User } from '../types';
import { createProfile, deleteProfile, updateProfile } from '../services/profileService';
import { AvatarPicker, AVATAR_MAP } from './AvatarPicker';

interface ProfileSelectionPageProps {
    onProfileSelect: (profile: Profile) => void;
    onLogout: () => void;
    profiles: Profile[];
    onProfilesChange: () => void;
    isLoading?: boolean;
    user: User | null;
}

export const ProfileSelectionPage: React.FC<ProfileSelectionPageProps> = ({
    onProfileSelect,
    onLogout,
    profiles,
    onProfilesChange,
    isLoading: isExternalLoading = false,
    user
}) => {
    // Retry loading profiles on mount if empty (handle refresh race condition)
    useEffect(() => {
        if (profiles.length === 0 && !isExternalLoading) {
            onProfilesChange();
        }
    }, [profiles.length, isExternalLoading, onProfilesChange]);

    const [isLocalLoading, setIsLocalLoading] = useState(false);
    const [isCreatingAvatarSelection, setIsCreatingAvatarSelection] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Edit & Delete State
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
    const [avatarPickerProfile, setAvatarPickerProfile] = useState<Profile | null>(null);
    const [editName, setEditName] = useState('');

    const [newProfileName, setNewProfileName] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isLoading = isExternalLoading || isLocalLoading;

    const handleAvatarSelect = async (avatarId: string) => {
        // Mode 1: Editing existing profile
        if (avatarPickerProfile) {
            setIsLocalLoading(true);
            try {
                await updateProfile(avatarPickerProfile.id, { avatarId });
                await onProfilesChange();
                setAvatarPickerProfile(null);
            } catch (e: any) {
                setErrorMsg(e.message || "Failed to update avatar");
            } finally {
                setIsLocalLoading(false);
            }
            return;
        }

        // Mode 2: Creating new profile
        if (isCreatingAvatarSelection) {
            setIsLocalLoading(true);
            try {
                const newProfile = await createProfile(newProfileName, avatarId);
                await onProfilesChange();
                setIsCreatingAvatarSelection(false);
                setNewProfileName('');
                onProfileSelect(newProfile);
            } catch (e: any) {
                setErrorMsg(e.message || "Failed to create profile");
                // If failed, maybe go back?
                setIsCreatingAvatarSelection(false);
                setIsCreating(true);
            } finally {
                setIsLocalLoading(false);
            }
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProfile || !editName.trim()) return;

        setIsLocalLoading(true);
        try {
            await updateProfile(editingProfile.id, { displayName: editName });
            await onProfilesChange();
            setEditingProfile(null);
            setEditName('');
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to update profile");
        } finally {
            setIsLocalLoading(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!deletingProfile) return;

        setIsLocalLoading(true);
        try {
            await deleteProfile(deletingProfile.id);
            await onProfilesChange();
            setDeletingProfile(null);
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to delete profile");
        } finally {
            setIsLocalLoading(false);
        }
    };

    const handleProceedToAvatarSelection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProfileName.trim()) return;
        setIsCreating(false);
        setIsCreatingAvatarSelection(true);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-slate-800 text-center mb-2">Who is learning?</h1>
                <p className="text-slate-500 text-center mb-8">Select a profile to continue</p>

                {errorMsg && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-center text-sm">
                        {errorMsg}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 mb-6">
                    {profiles.map(profile => (
                        <div key={profile.id} className="group relative">
                            <div
                                onClick={() => onProfileSelect(profile)}
                                className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:border-rose-100 transition-all text-left group-hover:pr-24 cursor-pointer"
                            >
                                {/* Avatar Circle */}
                                <div className="relative group/avatar">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden ${AVATAR_MAP[profile.avatarId] ? 'bg-white' : 'bg-rose-100 text-rose-500'}`}
                                    >
                                        {AVATAR_MAP[profile.avatarId] ? (
                                            <img src={AVATAR_MAP[profile.avatarId]} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            profile.displayName.substring(0, 1).toUpperCase()
                                        )}
                                    </div>

                                    {/* Edit Avatar Overlay Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAvatarPickerProfile(profile);
                                        }}
                                        className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-slate-200 opacity-0 group-hover:opacity-100 group-hover/avatar:opacity-100 transition-opacity hover:bg-slate-50"
                                    >
                                        <Pencil className="w-3 h-3 text-slate-500" />
                                    </button>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 text-lg truncate">{profile.displayName}</h3>
                                    <div className="flex items-center text-xs text-slate-400 mt-1 gap-2">
                                        <span className="font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Lv {1 + Math.floor((profile.stats?.masteredWords || 0) / 10)}</span>

                                        {(profile.stats?.totalZh || 0) > 0 && (
                                            <span className="flex items-baseline gap-0.5">
                                                <span className="font-bold text-rose-500">{profile.stats?.learningZh ?? 0}</span>
                                                <span className="text-slate-300">/</span>
                                                <span>{profile.stats?.totalZh}</span>
                                                <span className="ml-0.5 text-[10px] uppercase font-bold text-slate-400">Zh</span>
                                            </span>
                                        )}

                                        {(profile.stats?.totalEn || 0) > 0 && (
                                            <>
                                                {(profile.stats?.totalZh || 0) > 0 && <span className="text-slate-200">|</span>}
                                                <span className="flex items-baseline gap-0.5">
                                                    <span className="font-bold text-indigo-500">{profile.stats?.learningEn ?? 0}</span>
                                                    <span className="text-slate-300">/</span>
                                                    <span>{profile.stats?.totalEn}</span>
                                                    <span className="ml-0.5 text-[10px] uppercase font-bold text-slate-400">En</span>
                                                </span>
                                            </>
                                        )}

                                        {/* Fallback for legacy (if new stats missing) */}
                                        {(!profile.stats?.totalZh && !profile.stats?.totalEn && (profile.stats?.totalWords || 0) > 0) && (
                                            <span>{profile.stats?.learningWords || 0} / {profile.stats?.totalWords || 0} words</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-400 shrink-0" />
                            </div>

                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingProfile(profile);
                                        setEditName(profile.displayName);
                                    }}
                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingProfile(profile);
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-slate-100 p-4 rounded-xl border-2 border-dashed border-slate-300 flex items-center gap-4 hover:bg-slate-200 hover:border-slate-400 transition-all text-left"
                    >
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-600 text-lg">Add New Profile</h3>
                        </div>
                    </button>
                </div>

                <div className="text-center mt-8">
                    {user && (
                        <p className="text-slate-400 text-sm mb-2">
                            Logged in as <span className="font-semibold text-slate-600">{user.email}</span>
                        </p>
                    )}
                    <button onClick={onLogout} className="text-slate-400 text-sm hover:text-slate-600 underline">
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Create Profile Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Create Profile</h2>
                            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleProceedToAvatarSelection}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    placeholder="Enter name"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newProfileName.trim() || isLoading}
                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors disabled:opacity-50"
                                >
                                    Choose Avatar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {editingProfile && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Edit Profile</h2>
                            <button onClick={() => setEditingProfile(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleUpdateProfile}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter name"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingProfile(null)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!editName.trim() || isLoading}
                                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingProfile && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-red-100">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Delete {deletingProfile.displayName}?</h2>
                            <p className="text-slate-500 text-sm">
                                This will permanently delete this profile and all its progress. This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeletingProfile(null)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProfile}
                                disabled={isLoading}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Avatar Picker Modal */}
            {(avatarPickerProfile || isCreatingAvatarSelection) && (
                <AvatarPicker
                    isOpen={!!avatarPickerProfile || isCreatingAvatarSelection}
                    onClose={() => {
                        if (isCreatingAvatarSelection) {
                            // Back to name input
                            setIsCreatingAvatarSelection(false);
                            setIsCreating(true);
                        } else {
                            setAvatarPickerProfile(null);
                        }
                    }}
                    onSelect={handleAvatarSelect}
                    currentAvatarId={avatarPickerProfile?.avatarId}
                    displayName={isCreatingAvatarSelection ? newProfileName : avatarPickerProfile?.displayName}
                />
            )}
        </div>
    );
};
