import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only display if the device itself loses internet connection
  if (isBrowserOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-rose-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center space-x-2 shadow-md transition-all duration-300 z-50 shrink-0"
    >
      <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
      <span>You are currently offline. Please check your internet connection.</span>
    </div>
  );
}
