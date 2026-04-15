import React, { useState } from 'react';
import { UserPersona } from '../types';

interface OnboardingScreenProps {
  onSelect: (persona: UserPersona) => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onSelect }) => {
  const [exiting, setExiting] = useState(false);

  const handleSelect = (persona: UserPersona) => {
    setExiting(true);
    setTimeout(() => onSelect(persona), 800);
  };

  return (
    <div className={`
      absolute inset-0 z-[60] flex flex-col bg-black
      transition-all duration-1000 ease-in-out overflow-y-auto overflow-x-hidden
      ${exiting ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}
    `}>
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none fixed" style={{
        backgroundImage: 'radial-gradient(circle at center, #111827 0%, #000 70%)'
      }}></div>
      
      <div className="relative z-10 w-full px-4 pt-24 pb-12 md:px-6 md:py-12 flex flex-col items-center min-h-screen md:justify-center">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4">
          <div className="inline-block px-3 py-1 border border-gray-800 rounded-full text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-gray-500 animate-pulse">
            System Initialization
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Identity Calibration
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-xs md:text-sm leading-relaxed px-4">
            Select your operating profile to align Kai's financial models with your risk tolerance and information density preferences.
          </p>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl">
          
          {/* Option 1: Everyday Investor */}
          <button 
            onClick={() => handleSelect('Everyday Investor')}
            className="group relative bg-gray-900/40 border border-blue-900/30 hover:border-blue-500/60 rounded-2xl p-6 md:p-8 text-left transition-all duration-500 hover:bg-gray-900/80 hover:-translate-y-2 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-900/20 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500">
               <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-blue-100 mb-2 group-hover:text-blue-400 transition-colors">Everyday Investor</h3>
            <p className="text-[10px] md:text-xs text-gray-500 mb-3 md:mb-4 uppercase tracking-widest font-bold">Focus: The "Why"</p>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed group-hover:text-gray-300">
              Balanced insights focusing on long-term growth and stability. Plain English explanations with zero jargon.
            </p>
          </button>

          {/* Option 2: Active Trader */}
          <button 
            onClick={() => handleSelect('Active Trader')}
            className="group relative bg-gray-900/40 border border-orange-900/30 hover:border-orange-500/60 rounded-2xl p-6 md:p-8 text-left transition-all duration-500 hover:bg-gray-900/80 hover:-translate-y-2 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-900/20 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500">
               <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-orange-100 mb-2 group-hover:text-orange-400 transition-colors">Active Trader</h3>
            <p className="text-[10px] md:text-xs text-gray-500 mb-3 md:mb-4 uppercase tracking-widest font-bold">Focus: Signals</p>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed group-hover:text-gray-300">
              High-frequency updates, volatility metrics, and catalyst tracking. Prioritizes price action and sentiment shifts.
            </p>
          </button>

          {/* Option 3: Professional Advisor */}
          <button 
            onClick={() => handleSelect('Professional Advisor')}
            className="group relative bg-gray-900/40 border border-purple-900/30 hover:border-purple-500/60 rounded-2xl p-6 md:p-8 text-left transition-all duration-500 hover:bg-gray-900/80 hover:-translate-y-2 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-900/20 flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500">
               <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-purple-100 mb-2 group-hover:text-purple-400 transition-colors">Professional Advisor</h3>
            <p className="text-[10px] md:text-xs text-gray-500 mb-3 md:mb-4 uppercase tracking-widest font-bold">Focus: Risk & Data</p>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed group-hover:text-gray-300">
              Deep research, compliance-friendly artifacts, and comprehensive risk modeling. Data-heavy and precise.
            </p>
          </button>
        </div>
        
        <div className="mt-8 md:mt-12 text-[8px] md:text-[10px] text-gray-700 font-mono tracking-widest">
           SESSION ID: {Math.random().toString(36).substring(7).toUpperCase()} // SECURE
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
