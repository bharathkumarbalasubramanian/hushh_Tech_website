/**
 * kai - Financial Intelligence Agent
 * KaiAvatar - 3D/4D animated avatar component with audio visualization
 */

import React, { useMemo } from 'react';

interface KaiAvatarProps {
  volume: number;
  audioData: Uint8Array;
  active: boolean;
}

const KaiAvatar: React.FC<KaiAvatarProps> = ({ volume, audioData, active }) => {
  // Create audio-reactive rings
  const rings = useMemo(() => {
    const ringCount = 5;
    return Array.from({ length: ringCount }, (_, i) => ({
      id: i,
      delay: i * 0.15,
      scale: 1 + (i * 0.3),
    }));
  }, []);

  // Calculate pulse intensity from volume
  const pulseIntensity = active ? Math.min(1, volume * 2) : 0;
  const glowOpacity = 0.3 + (pulseIntensity * 0.4);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer ambient glow */}
      <div
        className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 blur-3xl transition-all duration-300"
        style={{
          transform: `scale(${1 + pulseIntensity * 0.3})`,
          opacity: glowOpacity,
        }}
      />

      {/* Animated rings */}
      {rings.map((ring) => (
        <div
          key={ring.id}
          className="absolute rounded-full border border-emerald-500/20 transition-all duration-500"
          style={{
            width: `${200 + ring.id * 80}px`,
            height: `${200 + ring.id * 80}px`,
            transform: `scale(${active ? ring.scale + pulseIntensity * 0.1 : ring.scale})`,
            opacity: active ? 0.3 - ring.id * 0.05 : 0.1,
            animation: active ? `pulse ${2 + ring.delay}s ease-in-out infinite` : 'none',
            animationDelay: `${ring.delay}s`,
          }}
        />
      ))}

      {/* Core avatar circle */}
      <div
        className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center shadow-2xl transition-all duration-200"
        style={{
          boxShadow: active
            ? `0 0 60px rgba(16, 185, 129, ${0.3 + pulseIntensity * 0.3}), 
               0 0 120px rgba(6, 182, 212, ${0.2 + pulseIntensity * 0.2})`
            : '0 0 40px rgba(16, 185, 129, 0.1)',
          transform: `scale(${1 + pulseIntensity * 0.05})`,
        }}
      >
        {/* Inner gradient ring */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/20" />

        {/* Center icon/text */}
        <div className="relative z-10 text-center">
          <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            K
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">
            {active ? 'ACTIVE' : 'STANDBY'}
          </div>
        </div>

        {/* Audio frequency bars (when active) */}
        {active && audioData.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-8">
            {Array.from({ length: 16 }, (_, i) => {
              const index = Math.floor((i / 16) * audioData.length);
              const height = (audioData[index] / 255) * 100;
              return (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-emerald-500 to-cyan-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, height * 0.32)}px` }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-gray-600'
          }`}
          style={{
            animation: active ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />
        <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">
          {active ? 'CONNECTED' : 'OFFLINE'}
        </span>
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default KaiAvatar;
