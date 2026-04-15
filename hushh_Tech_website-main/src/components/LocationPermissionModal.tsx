import { useEffect } from 'react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onRequestLocation: () => void;
  onSkip: () => void;
  isDetecting: boolean;
}

export default function LocationPermissionModal({
  isOpen,
  onRequestLocation,
  onSkip,
  isDetecting,
}: LocationPermissionModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enable location"
    >
      <div
        className="w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scaleIn sm:rounded-3xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-8 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          {/* Location Icon */}
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="flex items-center justify-center rounded-full bg-[#2F80ED] shadow-lg size-16 sm:size-20">
              <svg
                className="text-white size-8 sm:size-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-black text-center mb-2.5">
            Enable Location
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-600 text-center mb-4 leading-relaxed">
            We'll detect your location to auto-fill your country and region. This helps us comply with investment
            regulations.
          </p>

          {/* How it works */}
          <div className="bg-slate-50 rounded-xl p-3 sm:p-4 mb-5 sm:mb-6">
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mb-2">How it works:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[11px] sm:text-xs font-bold mt-0.5 text-[#2F80ED]">1.</span>
                <p className="text-[11px] sm:text-xs text-slate-600">Tap &quot;Detect My Location&quot; below</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[11px] sm:text-xs font-bold mt-0.5 text-[#2F80ED]">2.</span>
                <p className="text-[11px] sm:text-xs text-slate-600">
                  Allow location access when prompted by your browser
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[11px] sm:text-xs font-bold mt-0.5 text-[#2F80ED]">3.</span>
                <p className="text-[11px] sm:text-xs text-slate-600">Your country will be filled in automatically</p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {/* CTA Button */}
            <button
              onClick={onRequestLocation}
              disabled={isDetecting}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 sm:px-6 sm:py-4 text-white rounded-xl font-semibold text-base sm:text-lg active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-wait bg-[#2F80ED] hover:bg-[#2570D4] disabled:hover:bg-[#2F80ED]"
            >
              {isDetecting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Detecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Detect My Location</span>
                </>
              )}
            </button>

            {/* Skip Button */}
            <button
              onClick={onSkip}
              disabled={isDetecting}
              className="w-full px-4 py-2.5 text-slate-600 hover:text-black font-semibold text-sm sm:text-base transition-colors disabled:opacity-50"
            >
              Select Manually Instead -&gt;
            </button>
          </div>

          {/* Privacy Note */}
          <div className="mt-5 sm:mt-6 flex items-start justify-center gap-2 text-xs text-slate-400">
            <svg
              className="mt-0.5 shrink-0"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-center">
              Your location is only used to auto-fill your country. We do not track your movements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

