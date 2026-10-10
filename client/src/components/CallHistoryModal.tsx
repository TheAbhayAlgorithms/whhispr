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
} from 'lucide-react';
import { CallHistoryItem } from '../types/call';
import { DevicesLoading } from './DevicesLoading';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-xl bg-[#141515] border-t sm:border border-[#2C2E2E] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] pb-safe animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#2C2E2E] shrink-0 bg-[#141515]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#202222] border border-[#2D3030] text-[#20B2AA] flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#EDEDED]">Call Log</h3>
              <p className="text-xs text-[#9EA3A3]">
                Recent voice and video conversations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#202222] text-[#9EA3A3] hover:text-[#EDEDED] transition touch-target-44 flex items-center justify-center shrink-0"
            aria-label="Close call history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Call List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#242626] p-2 bg-[#141515]">
          {isLoadingHistory ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <DevicesLoading size="sm" label="Loading call history..." />
            </div>
          ) : callHistory.length === 0 ? (
            <div className="py-16 text-center text-[#737878]">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-[#EDEDED]">
                No recent calls
              </p>
              <p className="text-xs text-[#737878] mt-1">
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
                  className="flex items-center justify-between p-3.5 hover:bg-[#191A1A] rounded-xl transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* User Avatar */}
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#202222] border border-[#2D3030] flex items-center justify-center shrink-0">
                      {other?.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[#20B2AA]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-medium text-[#EDEDED] truncate">
                          {other?.display_name || other?.username || 'Unknown'}
                        </span>
                        {item.type === 'video' ? (
                          <Video className="w-3.5 h-3.5 text-[#20B2AA] shrink-0" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-[#737878] shrink-0" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#9EA3A3] mt-0.5">
                        <div className="flex items-center space-x-1">
                          {isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-rose-400" />
                          ) : isOutgoing ? (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-[#737878]" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-[#20B2AA]" />
                          )}
                          <span
                            className={
                              isMissed
                                ? 'text-rose-400 font-medium'
                                : 'text-[#9EA3A3]'
                            }
                          >
                            {isMissed
                              ? 'Missed'
                              : isOutgoing
                                ? 'Outgoing'
                                : 'Incoming'}
                          </span>
                        </div>
                        <span className="text-[#737878]">•</span>
                        <span>{formatDuration(item.duration)}</span>
                        <span className="text-[#737878]">•</span>
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
                        className="p-2 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#20B2AA] hover:text-[#1CA099] transition cursor-pointer"
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
                        className="p-2 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#EDEDED] hover:text-[#20B2AA] transition cursor-pointer"
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
