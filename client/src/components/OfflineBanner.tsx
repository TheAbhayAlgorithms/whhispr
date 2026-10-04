import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useSocketStore } from '../store/useSocketStore';

export function OfflineBanner() {
  const { status, connect } = useSocketStore();
  const isConnected = status === 'connected';
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      connect();
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect]);

  // If both browser is online and socket is connected, do not display banner
  if (isBrowserOnline && isConnected) {
    return null;
  }

  const handleManualReconnect = () => {
    setReconnecting(true);
    connect();
    setTimeout(() => setReconnecting(false), 2000);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md transition-all duration-300 z-50 shrink-0"
    >
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
        <span>
          {!isBrowserOnline
            ? 'You are currently offline. Check your internet connection.'
            : 'Disconnected from real-time gateway. Attempting automatic reconnection...'}
        </span>
      </div>

      <button
        onClick={handleManualReconnect}
        disabled={reconnecting}
        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${reconnecting ? 'animate-spin' : ''}`} />
        <span>{reconnecting ? 'Retrying...' : 'Reconnect'}</span>
      </button>
    </div>
  );
}
