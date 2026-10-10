import { useEffect } from 'react';
import { useNotificationStore } from '../store/useNotificationStore';
import { useChatStore } from '../store/useChatStore';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  MessageSquare,
  UserPlus,
  AtSign,
  PhoneMissed,
  Users,
  Smile,
  Clock,
  BellRing,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '../types/notification';
import { DevicesLoading } from './DevicesLoading';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'new_message':
      return <MessageSquare className="w-4 h-4 text-[#20B2AA]" />;
    case 'contact_request':
      return <UserPlus className="w-4 h-4 text-[#20B2AA]" />;
    case 'mention':
      return <AtSign className="w-4 h-4 text-amber-400" />;
    case 'call_missed':
      return <PhoneMissed className="w-4 h-4 text-rose-400" />;
    case 'group_invite':
      return <Users className="w-4 h-4 text-[#20B2AA]" />;
    case 'reaction':
      return <Smile className="w-4 h-4 text-pink-400" />;
    default:
      return <Bell className="w-4 h-4 text-[#20B2AA]" />;
  }
}

function formatNotificationTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function NotificationCenterModal({ isOpen, onClose }: NotificationCenterModalProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isPushSupported,
    isPushSubscribed,
    subscribePush,
  } = useNotificationStore();

  const selectChat = useChatStore((s) => s.selectChat);

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      void markAsRead(notif.id);
    }

    const data = notif.data as Record<string, string> | null;
    if (data?.chatId) {
      void selectChat(data.chatId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:w-96 bg-[#141515] border-l sm:border border-[#2C2E2E] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-[85vh] sm:mt-12 sm:mr-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-[#2C2E2E] pt-safe bg-[#141515]">
          <div className="flex items-center space-x-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#20B2AA] text-black rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#EDEDED]">Notifications</h3>
              <p className="text-[11px] text-[#737878]">
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-xs text-[#20B2AA] hover:bg-[#1D2B29] font-medium transition cursor-pointer flex items-center justify-center"
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222] transition cursor-pointer flex items-center justify-center"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Web Push Permission Banner */}
        {isPushSupported && !isPushSubscribed && (
          <div className="px-4 py-2.5 bg-[#1D2B29] border-b border-[#25423E] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-[#EDEDED]">
              <BellRing className="w-3.5 h-3.5 text-[#20B2AA] shrink-0" />
              <span className="text-[11px]">Enable desktop push notifications</span>
            </div>
            <button
              onClick={() => void subscribePush()}
              className="px-2.5 py-1 rounded-lg bg-[#20B2AA] text-black font-semibold text-[11px] hover:bg-[#1CA099] shadow-xs transition cursor-pointer"
            >
              Enable
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2C2E2E] p-2 bg-[#141515]">
          {isLoading && notifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <DevicesLoading size="sm" label="Loading alerts..." />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center text-[#9EA3A3]">
              <Clock className="w-8 h-8 mx-auto mb-2 text-[#737878] opacity-50" />
              <p className="text-sm font-semibold text-[#EDEDED]">
                No notifications yet
              </p>
              <p className="text-xs text-[#737878] mt-1">
                Mentions, contact requests, and activity alerts will appear here
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => void handleNotificationClick(notif)}
                className={`group relative flex items-start space-x-3 p-3 rounded-xl transition cursor-pointer ${
                  notif.is_read
                    ? 'hover:bg-[#202222] opacity-80'
                    : 'bg-[#1D2B29]/30 border border-[#25423E]/50 hover:bg-[#1D2B29]/60'
                }`}
              >
                {/* Icon Badge */}
                <div className="w-8 h-8 rounded-lg bg-[#202222] border border-[#2D3030] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <h4
                      className={`text-xs truncate ${
                        notif.is_read
                          ? 'font-medium text-[#EDEDED]'
                          : 'font-bold text-[#EDEDED]'
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#20B2AA] shrink-0" />
                    )}
                  </div>

                  {notif.body && (
                    <p className="text-xs text-[#9EA3A3] line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                  )}

                  <span className="text-[10px] text-[#737878] font-mono mt-1 block">
                    {formatNotificationTime(notif.created_at)}
                  </span>
                </div>

                {/* Delete button (hover) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteNotification(notif.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg text-[#737878] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Delete notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
