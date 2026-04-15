/**
 * IOSStatusBar - Reusable iOS status bar for onboarding steps
 * Displays time, signal, WiFi, and battery indicators
 */
import React, { useState, useEffect } from 'react';

export const IOSStatusBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      setCurrentTime(`${formattedHours}:${formattedMinutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-11 bg-white z-[9999] px-6 flex items-end justify-between pb-1.5"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
    >
      {/* Left: Time */}
      <span className="text-[15px] font-semibold text-black tracking-tight">
        {currentTime}
      </span>

      {/* Right: Signal + WiFi + Battery */}
      <div className="flex items-center gap-1">
        {/* Cellular Signal Bars */}
        <div className="flex items-end gap-[1px] h-3">
          <div className="w-[3px] h-[3px] bg-black rounded-[1px]" />
          <div className="w-[3px] h-[5px] bg-black rounded-[1px]" />
          <div className="w-[3px] h-[7px] bg-black rounded-[1px]" />
          <div className="w-[3px] h-[9px] bg-black rounded-[1px]" />
        </div>

        {/* WiFi Icon */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="mt-0.5">
          <path d="M8 12C8.55228 12 9 11.5523 9 11C9 10.4477 8.55228 10 8 10C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12Z" fill="black"/>
          <path d="M5.5 8.5C6.33 7.67 7.42 7.25 8 7.25C8.58 7.25 9.67 7.67 10.5 8.5" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M3 6C4.66 4.34 6.34 3.5 8 3.5C9.66 3.5 11.34 4.34 13 6" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M0.5 3.5C2.83 1.17 5.42 0 8 0C10.58 0 13.17 1.17 15.5 3.5" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        {/* Battery */}
        <div className="flex items-center gap-[1px]">
          <div className="w-[22px] h-[11px] border-[1.5px] border-black rounded-[3px] relative">
            <div className="absolute top-[1px] left-[1px] right-[1px] bottom-[1px] bg-black rounded-[1.5px]" />
          </div>
          <div className="w-[1.5px] h-1 bg-black rounded-r-[1px]" />
        </div>
      </div>
    </div>
  );
};

export default IOSStatusBar;
