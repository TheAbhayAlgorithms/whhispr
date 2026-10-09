import { useState } from 'react';
import { useE2eeStore } from '../store/useE2eeStore';
import { ShieldCheck, X, Copy, Check, QrCode } from 'lucide-react';

export function SafetyNumberModal() {
  const { activeSafetyModalPeer, closeSafetyNumberModal } = useE2eeStore();
  const [copied, setCopied] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  if (!activeSafetyModalPeer) return null;

  const { peerName, safetyNumber } = activeSafetyModalPeer;
  const groups = safetyNumber.split(' ');

  const handleCopy = () => {
    void navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col pb-safe animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Safety Number</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-End Encryption Verification
              </p>
            </div>
          </div>
          <button
            onClick={closeSafetyNumberModal}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition touch-target-44 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close safety number modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Signal Protocol Double Ratchet</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Compare this safety number with <strong className="text-slate-800 dark:text-slate-200">{peerName}</strong> to verify that your messages and calls are encrypted end-to-end.
            </p>
          </div>

          {/* 60-digit Numeric Matrix (12 blocks of 5) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
            {groups.map((group, idx) => (
              <div
                key={idx}
                className="text-center font-mono text-xs sm:text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900/60 shadow-xs border border-slate-100 dark:border-slate-800"
              >
                {group}
              </div>
            ))}
          </div>

          {/* Verification Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Safety Number'}</span>
            </button>

            <button
              onClick={() => setIsVerified(!isVerified)}
              className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer ${
                isVerified
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {isVerified ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Contact</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Mark as Verified</span>
                </>
              )}
            </button>
          </div>

          {isVerified && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>You have verified this contact. You will be alerted if their security keys change.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
