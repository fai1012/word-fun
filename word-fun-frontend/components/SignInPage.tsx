import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Sparkles, Brain } from 'lucide-react';

interface SignInPageProps {
    onLoginSuccess: (user: any) => void;
    onLoginError: () => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onLoginSuccess, onLoginError }) => {
    return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 relative overflow-hidden font-rounded text-coffee">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-salmon/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yolk/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="z-10 flex flex-col items-center max-w-md w-full text-center">
                <div className="mb-8 relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-salmon/20 to-yolk/20 rounded-full blur opacity-50"></div>
                    <div className="relative bg-white p-5 rounded-3xl border-4 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform">
                        <Brain className="w-12 h-12 text-salmon stroke-[2.5]" />
                    </div>
                    <div className="absolute -top-3 -right-3">
                        <Sparkles className="w-8 h-8 text-yolk animate-bounce stroke-[3]" />
                    </div>
                </div>

                <h1 className="text-4xl font-black text-coffee mb-2 tracking-tight">
                    Word Fun
                </h1>
                <p className="text-coffee/60 mb-10 text-lg font-bold">
                    Master vocabulary with <br />AI-powered personalized revisions.
                </p>

                <div className="w-full bg-white p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(93,64,55,1)] border-4 border-coffee flex flex-col items-center gap-6">
                    <div className="text-sm font-black text-coffee/30 uppercase tracking-widest bg-coffee/5 px-4 py-1 rounded-full">
                        Welcome Back
                    </div>

                    <div className="relative w-full max-w-[280px] h-[60px]">
                        {/* Custom Visual Button */}
                        <div className="absolute inset-0 bg-white rounded-2xl border-2 border-coffee shadow-[4px_4px_0px_0px_rgba(93,64,55,1)] flex items-center justify-center gap-3 transition-transform transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(93,64,55,1)] pointer-events-none">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="font-black text-coffee text-lg tracking-wide">Sign in with Google</span>
                        </div>

                        {/* Invisible Functional Layer */}
                        <div className="absolute inset-0 opacity-0 overflow-hidden flex items-center justify-center">
                            <GoogleLogin
                                onSuccess={credentialResponse => {
                                    if (credentialResponse.credential) {
                                        onLoginSuccess(credentialResponse);
                                    }
                                }}
                                onError={() => {
                                    console.log('Login Failed');
                                    onLoginError();
                                }}
                                theme="filled_black"
                                width="300"
                            />
                        </div>
                    </div>

                    <p className="text-xs font-bold text-coffee/30 max-w-[250px] leading-relaxed">
                        By signing in, you will be able to sync your progress across devices.
                    </p>
                </div>
            </div>
        </div>
    );
};
