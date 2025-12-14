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
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    // If ID is not found, we render nothing while the useEffect triggers the navigate
    // Or we could check immediately here
    const isValid = profiles.some(p => p.id === profileId);
    if (!isValid) return null;

    return <>{children}</>;
};
