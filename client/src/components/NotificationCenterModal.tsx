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
  Loader2,
  Clock,
  BellRing,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '../types/notification';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'new_message':
      return <MessageSquare className="w-4 h-4 text-indigo-500" />;
    case 'contact_request':
      return <UserPlus className="w-4 h-4 text-emerald-500" />;
    case 'mention':
      return <AtSign className="w-4 h-4 text-amber-500" />;
    case 'call_missed':
      return <PhoneMissed className="w-4 h-4 text-rose-500" />;
    case 'group_invite':
      return <Users className="w-4 h-4 text-violet-500" />;
    case 'reaction':
      return <Smile className="w-4 h-4 text-pink-500" />;
    default:
      return <Bell className="w-4 h-4 text-indigo-500" />;
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
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:w-96 bg-white dark:bg-slate-900 border-l sm:border border-slate-200 dark:border-slate-800 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-[85vh] sm:mt-12 sm:mr-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="p-1.5 rounded-lg text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium transition cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Web Push Permission Banner */}
        {isPushSupported && !isPushSubscribed && (
          <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
              <BellRing className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px]">Enable desktop push notifications</span>
            </div>
            <button
              onClick={() => void subscribePush()}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium text-[11px] hover:bg-indigo-500 shadow-xs transition cursor-pointer"
            >
              Enable
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {isLoading && notifications.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              <p className="text-xs">Loading alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No notifications yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Mentions, contact requests, and activity alerts will appear here
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => void handleNotificationClick(notif)}
                className={`group relative flex items-start space-x-3 p-3 rounded-2xl transition cursor-pointer ${
                  notif.is_read
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-80'
                    : 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40'
                }`}
              >
                {/* Icon Badge */}
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <h4
                      className={`text-xs truncate ${
                        notif.is_read
                          ? 'font-medium text-slate-700 dark:text-slate-300'
                          : 'font-bold text-slate-900 dark:text-white'
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>

                  {notif.body && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
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
                  className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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
