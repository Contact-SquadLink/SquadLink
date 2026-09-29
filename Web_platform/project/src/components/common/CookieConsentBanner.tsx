import { useState, useEffect } from 'react';
import { Cookie, X, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('squadlink_cookie_consent');
      if (!consent) {
        // Small delay so page renders smoothly first
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage access restricted
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('squadlink_cookie_consent', 'all');
    } catch {}
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('squadlink_cookie_consent', 'essential');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/95 p-4 sm:p-5 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-start gap-3.5 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>Cookie & Session Storage Preferences</span>
                <ShieldCheck className="h-3.5 w-3.5 text-primary-400" />
              </p>
              <p className="leading-relaxed">
                We use cookies and secure storage to keep you signed in, preserve active carts, and personalize delivery tracking. You can choose to accept all cookies or keep only essential authentication cookies.
              </p>
              <div className="pt-0.5 flex items-center gap-3 text-[11px] text-gray-400">
                <Link to="/privacy" className="text-primary-400 hover:underline">
                  Privacy Policy
                </Link>
                <span>·</span>
                <Link to="/terms" className="text-primary-400 hover:underline">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2 shrink-0 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="flex-1 sm:flex-none rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-gray-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 sm:flex-none rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-primary-500 transition-colors cursor-pointer"
            >
              Accept & Stay Signed In
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer ml-1 hidden sm:block"
              aria-label="Close cookie banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
