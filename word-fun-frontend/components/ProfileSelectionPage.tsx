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
            <div className="h-screen w-full flex flex-col items-center justify-center bg-cream font-rounded gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-salmon/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-16 h-16 border-4 border-coffee border-t-salmon rounded-full animate-spin"></div>
                </div>
                <div className="text-coffee font-black text-xl animate-pulse">
                    Loading Profiles...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 font-rounded text-coffee">
            <div className="w-full max-w-md">
                <h1 className="text-4xl font-black text-coffee text-center mb-2 tracking-tight">Who is learning?</h1>
                <p className="text-coffee/60 text-center mb-10 font-medium">Select a profile to continue</p>

                {errorMsg && (
                    <div className="bg-salmon/10 text-salmon border-2 border-salmon p-3 rounded-2xl mb-6 text-center text-sm font-bold shadow-sm">
                        {errorMsg}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 mb-8">
                    {profiles.map(profile => (
                        <div key={profile.id} className="group relative">
                            <div
                                onClick={() => onProfileSelect(profile)}
                                className="w-full bg-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(93,64,55,0.2)] border-2 border-coffee flex items-center gap-4 hover:shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-left group-hover:pr-24 cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                            >
                                {/* Avatar Circle */}
                                <div className="relative group/avatar">
                                    <div
                                        className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden border-2 border-coffee ${AVATAR_MAP[profile.avatarId] ? 'bg-white' : 'bg-salmon/10 text-salmon'}`}
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
                                        className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md border-2 border-coffee opacity-0 group-hover:opacity-100 group-hover/avatar:opacity-100 transition-opacity hover:bg-salmon hover:text-white hover:border-salmon"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-coffee text-xl truncate">{profile.displayName}</h3>
                                    <div className="flex items-center text-xs text-coffee/60 mt-1 gap-2 font-bold">
                                        <span className="bg-coffee/5 px-2 py-0.5 rounded-lg border border-coffee/10">Lv {1 + Math.floor((profile.stats?.masteredWords || 0) / 10)}</span>

                                        {(profile.stats?.totalZh || 0) > 0 && (
                                            <span className="flex items-baseline gap-0.5">
                                                <span className="text-salmon">{profile.stats?.learningZh ?? 0}</span>
                                                <span className="text-coffee/30">/</span>
                                                <span>{profile.stats?.totalZh}</span>
                                                <span className="ml-0.5 text-[10px] uppercase text-coffee/40">Zh</span>
                                            </span>
                                        )}

                                        {(profile.stats?.totalEn || 0) > 0 && (
                                            <>
                                                {(profile.stats?.totalZh || 0) > 0 && <span className="text-coffee/20">|</span>}
                                                <span className="flex items-baseline gap-0.5">
                                                    <span className="text-indigo-500">{profile.stats?.learningEn ?? 0}</span>
                                                    <span className="text-coffee/30">/</span>
                                                    <span>{profile.stats?.totalEn}</span>
                                                    <span className="ml-0.5 text-[10px] uppercase text-coffee/40">En</span>
                                                </span>
                                            </>
                                        )}

                                        {/* Fallback for legacy (if new stats missing) */}
                                        {(!profile.stats?.totalZh && !profile.stats?.totalEn && (profile.stats?.totalWords || 0) > 0) && (
                                            <span>{profile.stats?.learningWords || 0} / {profile.stats?.totalWords || 0} words</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-coffee/20 group-hover:text-salmon shrink-0 stroke-[3]" />
                            </div>

                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingProfile(profile);
                                        setEditName(profile.displayName);
                                    }}
                                    className="p-2.5 text-coffee/60 bg-white border-2 border-coffee hover:text-white hover:bg-indigo-500 hover:border-indigo-500 rounded-xl transition-colors shadow-sm"
                                >
                                    <Pencil className="w-5 h-5 stroke-[2.5]" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingProfile(profile);
                                    }}
                                    className="p-2.5 text-coffee/60 bg-white border-2 border-coffee hover:text-white hover:bg-salmon hover:border-salmon rounded-xl transition-colors shadow-sm"
                                >
                                    <Trash2 className="w-5 h-5 stroke-[2.5]" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-coffee/5 p-4 rounded-3xl border-2 border-dashed border-coffee/30 flex items-center gap-4 hover:bg-white hover:border-salmon hover:text-salmon transition-all text-left text-coffee/60 group"
                    >
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-coffee/40 border-2 border-coffee/20 shrink-0 group-hover:border-salmon group-hover:bg-salmon group-hover:text-white transition-colors">
                            <Plus className="w-7 h-7 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg">Add New Profile</h3>
                        </div>
                    </button>
                </div>

                <div className="text-center mt-12">
                    {user && (
                        <p className="text-coffee/40 text-sm mb-3 font-medium">
                            Logged in as <span className="font-bold text-coffee/70">{user.email}</span>
                        </p>
                    )}
                    <button onClick={onLogout} className="text-salmon font-bold text-sm hover:text-salmon/80 underline decoration-2 underline-offset-4">
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Create Profile Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-coffee/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-cream rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-coffee animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-coffee">Create Profile</h2>
                            <button onClick={() => setIsCreating(false)} className="text-coffee/40 hover:text-salmon transition-colors"><X className="w-6 h-6 stroke-[3]" /></button>
                        </div>
                        <form onSubmit={handleProceedToAvatarSelection}>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-coffee/70 mb-2">Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border-2 border-coffee/20 focus:outline-none focus:ring-4 focus:ring-salmon/20 focus:border-salmon text-coffee font-bold placeholder:text-coffee/30"
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 bg-white text-coffee/60 rounded-xl font-bold border-2 border-coffee/10 hover:bg-coffee/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newProfileName.trim() || isLoading}
                                    className="flex-1 py-3 bg-salmon text-white rounded-xl font-bold border-b-4 border-salmon/50 hover:border-salmon/70 hover:translate-y-[1px] active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4 shadow-sm"
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
                <div className="fixed inset-0 bg-coffee/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-cream rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-coffee animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-coffee">Edit Profile</h2>
                            <button onClick={() => setEditingProfile(null)} className="text-coffee/40 hover:text-salmon transition-colors"><X className="w-6 h-6 stroke-[3]" /></button>
                        </div>
                        <form onSubmit={handleUpdateProfile}>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-coffee/70 mb-2">Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border-2 border-coffee/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-coffee font-bold placeholder:text-coffee/30"
                                    placeholder="Enter name"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingProfile(null)}
                                    className="flex-1 py-3 bg-white text-coffee/60 rounded-xl font-bold border-2 border-coffee/10 hover:bg-coffee/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!editName.trim() || isLoading}
                                    className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold border-b-4 border-indigo-700/50 hover:border-indigo-700/70 hover:translate-y-[1px] active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4 shadow-sm"
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
                <div className="fixed inset-0 bg-coffee/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-cream rounded-3xl w-full max-w-sm p-6 shadow-2xl border-4 border-coffee animate-in zoom-in-95 duration-200 border-b-8 border-b-salmon/20">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-salmon/10 rounded-full flex items-center justify-center text-salmon mb-4 border-2 border-salmon/20">
                                <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
                            </div>
                            <h2 className="text-2xl font-black text-coffee mb-2">Delete {deletingProfile.displayName}?</h2>
                            <p className="text-coffee/60 text-sm font-medium px-4 leading-relaxed">
                                This will permanently delete this profile and all its progress. This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeletingProfile(null)}
                                className="flex-1 py-3 bg-white text-coffee/60 rounded-xl font-bold border-2 border-coffee/10 hover:bg-coffee/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProfile}
                                disabled={isLoading}
                                className="flex-1 py-3 bg-salmon text-white rounded-xl font-bold border-b-4 border-salmon/50 hover:border-salmon/70 hover:translate-y-[1px] active:border-b-0 active:translate-y-[4px] transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4 shadow-sm"
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
