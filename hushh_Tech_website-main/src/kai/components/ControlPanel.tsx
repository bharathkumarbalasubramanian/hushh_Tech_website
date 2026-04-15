import React from 'react';
import { ConnectionState } from '../types';

interface ControlPanelProps {
  state: ConnectionState;
  statusText: string;
  onConnect: () => void;
  onDisconnect: () => void;
  volume: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ state, statusText, onConnect, onDisconnect, volume }) => {
  const isConnected = state === ConnectionState.CONNECTED;
  const isConnecting = state === ConnectionState.CONNECTING;

  // Determine display text: Prefer specific status updates during connection/active states
  const displayText = statusText || (
    state === ConnectionState.DISCONNECTED ? 'System Standby' :
    state === ConnectionState.ERROR ? 'Link Malfunction' : ''
  );

  return (
    <div className="absolute bottom-6 md:bottom-10 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-3 md:gap-4 w-full max-w-md px-4 pointer-events-auto">
      <style>{`
        @keyframes kai-observe {
          0%, 100% { 
            opacity: 0.6; 
            color: #94a3b8; /* slate-400 */
            text-shadow: 0 0 0px transparent;
          }
          50% { 
            opacity: 1; 
            color: #e2e8f0; /* slate-200 */
            text-shadow: 0 0 10px rgba(56, 189, 248, 0.5); /* sky-400 glow */
          }
        }
        .animate-kai-observe {
          animation: kai-observe 3s ease-in-out infinite;
        }
      `}</style>

      {/* Narrative Status Line - The "Hush" Feedback */}
      <div className="h-6 md:h-8 flex items-center justify-center gap-3">
        {isConnected && displayText && (
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
        )}
        
        {displayText && (
          <div className={`text-xs md:text-sm font-mono tracking-widest uppercase transition-all duration-500 ${
            isConnected ? 'animate-kai-observe' : 
            isConnecting ? 'animate-pulse text-blue-200' : 
            'text-gray-600'
          }`}>
             {displayText}
          </div>
        )}

        {isConnected && displayText && (
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" style={{ animationDelay: '0.5s' }}></div>
        )}
      </div>

      {/* Main Action Button */}
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={`
          relative group overflow-hidden rounded-full px-8 py-3 md:px-12 md:py-4 transition-all duration-300
          ${isConnected 
            ? 'bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-200' 
            : 'bg-white/5 hover:bg-white/10 border border-white/20 text-white'
          }
          backdrop-blur-md shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span className="relative z-10 font-bold text-base md:text-lg tracking-wider whitespace-nowrap">
          {isConnected ? 'TERMINATE LINK' : isConnecting ? 'SYNCHRONIZING...' : 'INITIATE KAI'}
        </span>
        
        {/* Glow effect on hover */}
        <div className={`absolute inset-0 z-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${
           isConnected ? 'bg-red-500/10' : 'bg-white/10'
        }`}></div>
      </button>

      {/* Instructional / Flavor Text */}
      {!isConnected && !isConnecting && (
        <p className="text-gray-600 text-[8px] md:text-[10px] text-center max-w-xs mt-2 opacity-40 uppercase tracking-widest">
          Grant sensory access for 4D resonance
        </p>
      )}
    </div>
  );
};

export default ControlPanel;
