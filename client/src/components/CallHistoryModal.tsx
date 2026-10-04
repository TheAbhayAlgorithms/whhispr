import { useEffect } from 'react';
import { useCallStore } from '../store/useCallStore';
import { useAuthStore } from './../store/useAuthStore';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  X,
  User,
  Clock,
  Loader2,
} from 'lucide-react';
import { CallHistoryItem } from '../types/call';

interface CallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCall: (params: {
    recipientId: string;
    recipientName: string;
    recipientAvatar: string | null;
    callType: 'audio' | 'video';
  }) => void;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CallHistoryModal({ isOpen, onClose, onStartCall }: CallHistoryModalProps) {
  const { callHistory, isLoadingHistory, fetchCallHistory } = useCallStore();
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isOpen) {
      void fetchCallHistory();
    }
  }, [isOpen, fetchCallHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Call Log</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recent voice and video conversations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Call List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 p-2">
          {isLoadingHistory ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              <p className="text-xs">Loading call history...</p>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No recent calls
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Voice and video calls with your contacts will appear here
              </p>
            </div>
          ) : (
            callHistory.map((item: CallHistoryItem) => {
              const isOutgoing = item.caller_id === currentUser?.id;
              const other = isOutgoing ? item.recipient : item.caller;
              const isMissed = item.status === 'missed' || item.status === 'rejected';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* User Avatar */}
                    <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                      {other?.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {other?.display_name || other?.username || 'Unknown'}
                        </span>
                        {item.type === 'video' ? (
                          <Video className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <div className="flex items-center space-x-1">
                          {isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
                          ) : isOutgoing ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span
                            className={
                              isMissed
                                ? 'text-rose-500 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {isMissed
                              ? 'Missed'
                              : isOutgoing
                                ? 'Outgoing'
                                : 'Incoming'}
                          </span>
                        </div>
                        <span>•</span>
                        <span>{formatDuration(item.duration)}</span>
                        <span>•</span>
                        <span>{formatDate(item.started_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Call-back Buttons */}
                  {other && (
                    <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                      <button
                        onClick={() => {
                          onClose();
                          onStartCall({
                            recipientId: other.id,
                            recipientName: other.display_name || other.username,
                            recipientAvatar: other.avatar_url,
                            callType: 'audio',
                          });
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                        title="Call with voice"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onStartCall({
                            recipientId: other.id,
                            recipientName: other.display_name || other.username,
                            recipientAvatar: other.avatar_url,
                            callType: 'video',
                          });
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                        title="Call with video"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
