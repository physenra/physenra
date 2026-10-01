import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Initializing Physenra...' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
      <div className="mb-6 flex justify-center">
        <img
          src="/branding/physenra-logo-dark.png"
          alt="Physenra"
          className="h-10 w-auto max-w-[200px] object-contain"
        />
      </div>
      <div className="w-8 h-8 border-3 border-teal-500/30 border-t-teal-400 rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-slate-400 font-medium tracking-wide">{message}</p>
    </div>
  );
};
