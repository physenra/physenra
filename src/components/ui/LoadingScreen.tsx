import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Initializing Physenra...' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-xl tracking-wider text-slate-950 shadow-lg shadow-teal-500/20">
          P
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">Physenra</span>
      </div>
      <div className="w-8 h-8 border-3 border-teal-500/30 border-t-teal-400 rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-slate-400 font-medium tracking-wide">{message}</p>
    </div>
  );
};
