import { useEffect, useState } from 'react';

interface PermissionHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PermissionHelpModal = ({ isOpen, onClose }: PermissionHelpModalProps) => {
  const [browser, setBrowser] = useState<string>('chrome');

  useEffect(() => {
    // Detect browser
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('edg')) {
      setBrowser('edge');
    } else if (userAgent.includes('chrome')) {
      setBrowser('chrome');
    } else if (userAgent.includes('firefox')) {
      setBrowser('firefox');
    } else if (userAgent.includes('safari')) {
      setBrowser('safari');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              How to Enable Location Access
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Browser-specific instructions */}
          {browser === 'chrome' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Follow these steps to enable location access in Chrome:
              </p>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">1.</span>
                  <span>Click the lock icon 🔒 (or info icon) next to the URL in the address bar</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">2.</span>
                  <span>Find "Location" in the permissions list</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">3.</span>
                  <span>Change it from "Block" to "Allow"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">4.</span>
                  <span>Refresh this page and click "Try Again"</span>
                </li>
              </ol>
            </div>
          )}

          {browser === 'safari' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Follow these steps to enable location access in Safari:
              </p>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">1.</span>
                  <span>Go to Safari → Settings (or Preferences)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">2.</span>
                  <span>Click the "Websites" tab</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">3.</span>
                  <span>Select "Location" in the left sidebar</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">4.</span>
                  <span>Find hushhtech.com and set to "Allow"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">5.</span>
                  <span>Refresh this page and click "Try Again"</span>
                </li>
              </ol>
            </div>
          )}

          {browser === 'firefox' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Follow these steps to enable location access in Firefox:
              </p>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">1.</span>
                  <span>Click the lock icon 🔒 next to the URL</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">2.</span>
                  <span>Click "Connection secure" → "More information"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">3.</span>
                  <span>Go to the "Permissions" tab</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">4.</span>
                  <span>Find "Access Your Location"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">5.</span>
                  <span>Uncheck "Use default" and check "Allow"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">6.</span>
                  <span>Refresh this page and click "Try Again"</span>
                </li>
              </ol>
            </div>
          )}

          {browser === 'edge' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Follow these steps to enable location access in Edge:
              </p>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">1.</span>
                  <span>Click the lock icon 🔒 next to the URL in the address bar</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">2.</span>
                  <span>Find "Location" in the permissions list</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">3.</span>
                  <span>Change it from "Block" to "Allow"</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-blue-600 shrink-0">4.</span>
                  <span>Refresh this page and click "Try Again"</span>
                </li>
              </ol>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600 mb-3">
              Or you can skip this and manually select your country below.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-[#2b8cee] text-white rounded-lg font-semibold hover:bg-[#2070c0] transition-all active:scale-[0.98]"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionHelpModal;
