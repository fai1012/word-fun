import React, { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Profile } from '../types';

interface ProfileGuardProps {
    profiles: Profile[];
    isLoading: boolean;
    currentProfile: Profile | null;
    onProfileSwitch: (profile: Profile) => void;
    children: React.ReactNode;
}

export const ProfileGuard: React.FC<ProfileGuardProps> = ({
    profiles,
    isLoading,
    currentProfile,
    onProfileSwitch,
    children
}) => {
    const { profileId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && profileId) {
            const foundProfile = profiles.find(p => p.id === profileId);

            if (foundProfile) {
                // If URL ID is valid but doesn't match current state, switch it
                if (!currentProfile || currentProfile.id !== foundProfile.id) {
                    onProfileSwitch(foundProfile);
                }
            } else {
                // Invalid ID - Redirect
                console.warn(`Profile ID ${profileId} not found. Redirecting...`);
                navigate('/profiles', { replace: true });
            }
        }
    }, [isLoading, profileId, profiles, currentProfile, onProfileSwitch, navigate]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-cream min-h-[50vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-salmon/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-12 h-12 border-4 border-coffee border-t-salmon rounded-full animate-spin"></div>
                </div>
                <div className="mt-4 text-coffee font-black text-lg animate-pulse">
                    Loading...
                </div>
            </div>
        );
    }

    // Only render children if we have a profile that matches the one in the URL
    const isValid = profiles.some(p => p.id === profileId);
    if (!isValid || !currentProfile || currentProfile.id !== profileId) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-cream min-h-[50vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-salmon/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-12 h-12 border-4 border-coffee border-t-salmon rounded-full animate-spin"></div>
                </div>
                <div className="mt-4 text-coffee font-black text-lg animate-pulse">
                    Syncing Profile...
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
