import React, { useState, useRef, useEffect } from 'react';
import { ConnectionState, DecisionCardData, UserPersona } from './types';
import { GeminiService } from './services/geminiService';
import KaiAvatar from './components/KaiAvatar';
import ControlPanel from './components/ControlPanel';
import DecisionCard from './components/DecisionCard';
import OnboardingScreen from './components/OnboardingScreen';

const KaiApp: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  const [statusText, setStatusText] = useState<string>("");
  const [decisionData, setDecisionData] = useState<DecisionCardData | null>(null);
  const [userPersona, setUserPersona] = useState<UserPersona | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);

  // Initialize service ref (but don't connect yet)
  useEffect(() => {
    if (videoRef.current) {
      geminiServiceRef.current = new GeminiService({
        onConnectionStateChange: setConnectionState,
        onVolumeChange: setVolume,
        onAudioData: setAudioData,
        onStatusChange: setStatusText,
        onDecisionCard: setDecisionData,
        videoElement: videoRef.current,
      });
    }
    
    // Cleanup on unmount
    return () => {
      geminiServiceRef.current?.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    if (!userPersona) return;
    setDecisionData(null);
    await geminiServiceRef.current?.connect(userPersona);
  };

  const handleDisconnect = async () => {
    await geminiServiceRef.current?.disconnect();
    setVolume(0);
    setAudioData(new Uint8Array(0));
    setStatusText("Link terminated.");
    setTimeout(() => setStatusText(""), 2000);
  };

  const handleBackToOnboarding = async () => {
    await handleDisconnect();
    setUserPersona(null);
    setDecisionData(null);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-950 via-black to-black pointer-events-none"></div>
      
      {/* Grid Pattern Overlay for Sci-Fi feel */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>

      {/* Hidden Video Element for capturing frames */}
      <video 
        ref={videoRef} 
        className="absolute top-4 right-4 w-24 h-16 md:w-32 md:h-24 object-cover rounded-lg border border-gray-800 opacity-50 z-20 grayscale hover:grayscale-0 transition-all"
        muted 
        playsInline 
      />

      {/* Navigation: Back to Persona Selection */}
      {userPersona && !decisionData && (
        <button
          onClick={handleBackToOnboarding}
          className="absolute top-4 left-4 md:top-6 md:left-6 z-50 p-2 md:p-3 rounded-full bg-gray-900/40 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-800/80 transition-all backdrop-blur-sm group"
          aria-label="Back to Setup"
        >
           <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
           </svg>
        </button>
      )}

      {/* Onboarding Screen - Shows until persona is selected */}
      {!userPersona && (
        <OnboardingScreen onSelect={setUserPersona} />
      )}
      
      {/* The 3D/4D Avatar */}
      <div className={`
        relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center transition-all duration-1000
        ${!userPersona ? 'opacity-0 scale-90 blur-lg' : 'opacity-100 scale-100 blur-0'}
      `}
           style={{ opacity: decisionData ? 0.3 : (userPersona ? 1 : 0), transform: decisionData ? 'scale(0.9)' : 'scale(1)' }}>
         <KaiAvatar 
           volume={volume} 
           audioData={audioData}
           active={connectionState === ConnectionState.CONNECTED} 
         />
      </div>

      {/* Decision Card Overlay */}
      {decisionData && (
        <DecisionCard 
          data={decisionData} 
          onClose={() => setDecisionData(null)}
          onRequestNews={(ticker) => geminiServiceRef.current?.requestNewsUpdate(ticker)}
        />
      )}

      {/* UI Controls */}
      <div className={`transition-all duration-1000 delay-500 ${!userPersona ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'} ${decisionData ? 'opacity-20 pointer-events-none' : ''}`}>
        <ControlPanel 
            state={connectionState} 
            statusText={statusText}
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect} 
            volume={volume}
        />
      </div>
      
      {/* Footer / Version */}
      <div className="absolute bottom-2 right-4 text-gray-800 text-[8px] md:text-[10px] uppercase font-mono tracking-widest flex items-center gap-3">
        {userPersona && (
          <span className="text-emerald-900 bg-emerald-900/10 px-2 py-0.5 rounded border border-emerald-900/30">
            PROFILE: {userPersona}
          </span>
        )}
        <span className="hidden sm:inline">Kai System v5.0 // Financial Core</span>
      </div>
    </div>
  );
};

export default KaiApp;
