import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useContactStore } from '../store/useContactStore';
import { useSocketStore } from '../store/useSocketStore';
import { useProfileStore } from '../store/useProfileStore';
import { UserProfileModal } from '../components/UserProfileModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { ChannelBrowserModal } from '../components/ChannelBrowserModal';
import { GroupDetailsDrawer } from '../components/GroupDetailsDrawer';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { InChatSearchBar } from '../components/InChatSearchBar';
import { CallModal } from '../components/CallModal';
import { CallHistoryModal } from '../components/CallHistoryModal';
import { SafetyNumberModal } from '../components/SafetyNumberModal';
import { NotificationCenterModal } from '../components/NotificationCenterModal';
import { DecryptedText } from '../components/DecryptedText';
import { Chat, ChatMessage, MessageAttachment } from '../types/chat';
import { useSearchStore } from '../store/useSearchStore';
import { useCallStore } from '../store/useCallStore';
import { useE2eeStore } from '../store/useE2eeStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { getSocket } from '../lib/socket';
import { OfflineBanner } from '../components/OfflineBanner';
import { ChatListSkeleton, MessagesSkeleton } from '../components/Skeletons';
import { EmptyState } from '../components/EmptyState';
import {
  MessageSquare,
  LogOut,
  User as UserIcon,
  Users,
  Radio,
  Send,
  Bell,
  Search,
  Check,
  CheckCheck,
  Sparkles,
  Smile,
  Info,
  Hash,
  Compass,
  Plus,
  Globe,
  Lock,
  Paperclip,
  FileText,
  Download,
  X as CloseIcon,
  Loader2,
  Film,
  Music,
  Reply,
  Pencil,
  Trash2,
  Phone,
  PhoneCall,
  Video,
  Shield,
  Settings as SettingsIcon,
  ArrowLeft,
  Clock,
  AlertTriangle,
  MessageSquarePlus,
} from 'lucide-react';

function formatMessageTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDateHeader(dateString: string): string {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const EMOJI_SETS = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '🤪', '😎', '🥳', '😏', '🤔', '🤫', '😴', '🤯', '🥺', '😭', '😱'],
  gestures: ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '👋', '👊', '✊', '🤛', '🤜', '💪', '💅', '🤳'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '⭐', '🌟', '💥', '💯'],
  objects: ['🎉', '🚀', '💡', '🎈', '🎁', '🏆', '🥇', '🎯', '🎮', '🎲', '🎨', '🎬', '🎧', '📱', '💻', '☕', '🍕', '🍔', '🍰', '🎂', '🍩', '🍻', '🥂', '🌍', '🌈', '☀️', '🌙', '⚡', '❄️'],
};

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    chats,
    activeChatId,
    activeGroupDetails,
    messages,
    isLoadingChats,
    isLoadingMessages,
    isSending,
    typingUsers,
    fetchChats,
    selectChat,
    sendMessage,
    uploadMedia,
    toggleReaction,
    replyingTo,
    editingMessage,
    setReplyingTo,
    setEditingMessage,
    editMessage,
    deleteMessage,
    setupSocketListeners,
  } = useChatStore();

  const { incomingRequests, fetchRequests } = useContactStore();
  const { status: socketStatus, onlineUsers } = useSocketStore();
  const { fetchUserProfile, viewingProfile, clearViewingProfile } = useProfileStore();

  const [messageInput, setMessageInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showChannelBrowserModal, setShowChannelBrowserModal] = useState(false);
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);

  // Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<'smileys' | 'gestures' | 'hearts' | 'objects'>('smileys');
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // File Upload State
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Message Actions State
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search State
  const { inChatSearchOpen, toggleInChatSearch } = useSearchStore();
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Voice & Video Call State
  const [showCallHistoryModal, setShowCallHistoryModal] = useState(false);
  const { startCall, fetchIceServers } = useCallStore();

  useEffect(() => {
    void fetchIceServers();
  }, [fetchIceServers]);

  // End-to-End Encryption (Signal Protocol) State
  const {
    init: initE2ee,
    openSafetyNumberModal,
  } = useE2eeStore();

  useEffect(() => {
    void initE2ee();
  }, [initE2ee]);

  // In-App Notifications State
  const {
    unreadCount: unreadNotificationsCount,
    isOpen: isNotificationCenterOpen,
    toggleOpen: toggleNotificationCenter,
    fetchNotifications,
  } = useNotificationStore();

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearch((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (editingMessage) {
      setMessageInput(editingMessage.content);
      messageInputRef.current?.focus();
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyingTo) {
      messageInputRef.current?.focus();
    }
  }, [replyingTo]);

  const chatsList = Array.isArray(chats) ? chats : [];
  const activeChat = chatsList.find((c) => c.id === activeChatId);
  const currentMessages = activeChatId ? messages[activeChatId] || [] : [];
  const activeTyping = activeChatId ? typingUsers[activeChatId] || [] : [];

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInsertEmoji = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
  };

  // Initialize chats and socket listeners
  useEffect(() => {
    void fetchChats();
    void fetchRequests();
    const cleanup = setupSocketListeners();
    return cleanup;
  }, [fetchChats, fetchRequests, setupSocketListeners]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length, activeChatId]);

  // Generate local preview URL when staged file changes
  useEffect(() => {
    if (stagedFile && stagedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(stagedFile);
      setStagedPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setStagedPreviewUrl(null);
    }
  }, [stagedFile]);

  // Global keyboard shortcuts: ESC closes modals and drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowGlobalSearch(false);
        setShowCreateGroupModal(false);
        setShowChannelBrowserModal(false);
        setShowCallHistoryModal(false);
        setShowGroupDrawer(false);
        setShowEmojiPicker(false);
        setLightboxImageUrl(null);
        setDeletingMessage(null);
        clearViewingProfile();
        if (inChatSearchOpen) toggleInChatSearch();
        if (isNotificationCenterOpen) toggleNotificationCenter();
        setReplyingTo(null);
        setEditingMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setReplyingTo,
    setEditingMessage,
    clearViewingProfile,
    inChatSearchOpen,
    toggleInChatSearch,
    isNotificationCenterOpen,
    toggleNotificationCenter,
  ]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStagedFile(e.target.files[0]);
    }
  };

  const clearStagedFile = () => {
    setStagedFile(null);
    setStagedPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (activeChatId) {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('typing:start', { chatId: activeChatId });
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing:stop', { chatId: activeChatId });
        }, 3000);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || isSending || isUploadingMedia) return;
    if (!messageInput.trim() && !stagedFile) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('typing:stop', { chatId: activeChatId });
    }

    const content = messageInput;

    if (editingMessage) {
      setMessageInput('');
      try {
        await editMessage(editingMessage.id, content);
      } catch {
        setMessageInput(content);
      }
      return;
    }

    const fileToUpload = stagedFile;

    setMessageInput('');
    clearStagedFile();

    try {
      let attachmentItem: MessageAttachment | undefined;

      if (fileToUpload) {
        setIsUploadingMedia(true);
        attachmentItem = await uploadMedia(fileToUpload);
        setIsUploadingMedia(false);
      }

      const attachments = attachmentItem
        ? [
            {
              fileName: attachmentItem.fileName,
              fileSize: attachmentItem.fileSize,
              mimeType: attachmentItem.mimeType,
              storageKey: attachmentItem.storageKey,
              width: attachmentItem.width || undefined,
              height: attachmentItem.height || undefined,
              duration: attachmentItem.duration || undefined,
            },
          ]
        : undefined;

      // Always send messages as clean direct text so both sender and recipient can read them reliably
      const contentToSend = content;

      await sendMessage(activeChatId, contentToSend, replyingTo?.id, attachments);
    } catch {
      // Revert if sending failed
      setMessageInput(content);
      if (fileToUpload) setStagedFile(fileToUpload);
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteConfirm = async (mode: 'me' | 'everyone') => {
    if (!deletingMessage) return;
    setIsDeleting(true);
    try {
      await deleteMessage(deletingMessage.id, mode);
      setDeletingMessage(null);
    } catch {
      // Handled in store error
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInspectOtherUser = async (targetUserId: string) => {
    try {
      await fetchUserProfile(targetUserId);
    } catch {
      // Handled in store
    }
  };

  const filteredChats = chatsList.filter((chat) => {
    if (!chatSearch.trim()) return true;
    const query = chatSearch.toLowerCase();
    const nameMatch = chat.name?.toLowerCase().includes(query);
    const userMatch = chat.otherUser?.username.toLowerCase().includes(query);
    return nameMatch || userMatch;
  });

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-200">
      {/* Real-time offline and reconnect status bar */}
      <OfflineBanner />

      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Whispr
          </span>

          {/* Real-time Socket Connection Badge */}
          {socketStatus === 'connected' ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live
            </span>
          ) : socketStatus === 'connecting' ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium flex items-center">
              <Radio className="w-3 h-3 mr-1 animate-spin text-amber-500" />
              Connecting...
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 font-medium flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
              Offline
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Daylight / Dark Theme Toggle Button */}
          <ThemeToggle />

          {/* In-App Notifications Bell */}
          <button
            type="button"
            onClick={() => toggleNotificationCenter()}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-indigo-500" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowChannelBrowserModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition"
            title="Discover Public Channels"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explore Channels</span>
          </button>

          <Link
            to="/contacts"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition relative"
          >
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Contacts</span>
            {incomingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-600 dark:text-indigo-300 transition"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <Link
            to="/settings"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
            title="Settings & Preferences"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-500/40 text-xs font-semibold text-purple-600 dark:text-purple-300 transition"
              title="Admin Portal"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-right">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">
                {user?.displayName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                @{user?.username}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300 shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/30 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </header>

      {/* Main Two-Panel Chat Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Chats Sidebar */}
        <aside
          role="region"
          aria-label="Conversations list"
          className={`w-full sm:w-80 md:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col shrink-0 ${
            activeChat ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Sidebar Top Actions & Search */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Conversations
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setShowCallHistoryModal(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition"
                  title="View Call History"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Calls</span>
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
                  title="Create Group or Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search conversations..."
                aria-label="Search conversations"
                className="w-full pl-9 pr-14 py-2 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowGlobalSearch(true)}
                title="Global Search (⌘K)"
                aria-label="Global Search"
                className="absolute right-2 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                ⌘K
              </button>
            </div>
          </div>

          {/* Chats Scroll List */}
          <div
            className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40"
            role="list"
            aria-label="Chat conversations"
          >
            {isLoadingChats && chatsList.length === 0 ? (
              <ChatListSkeleton count={7} />
            ) : filteredChats.length === 0 ? (
              <div className="py-8 px-4">
                {chatSearch ? (
                  <EmptyState
                    icon={<Search className="w-7 h-7" />}
                    title="No chats match search"
                    description={`No conversations found matching "${chatSearch}". Try searching for another keyword.`}
                    actionText="Clear Filter"
                    onAction={() => setChatSearch('')}
                  />
                ) : (
                  <EmptyState
                    icon={<MessageSquarePlus className="w-7 h-7" />}
                    title="No active chats yet"
                    description="Connect with contacts or explore public channels to begin chatting securely on Whispr!"
                    actionText="Find Contacts"
                    actionIcon={<Users className="w-4 h-4" />}
                    onAction={() => navigate('/contacts')}
                  />
                )}
              </div>
            ) : (
              filteredChats.map((chat: Chat) => {
                const isSelected = chat.id === activeChatId;
                const isUserOnline =
                  chat.otherUser && onlineUsers[chat.otherUser.id]?.status === 'online';

                return (
                  <button
                    key={chat.id}
                    onClick={() => void selectChat(chat.id)}
                    className={`w-full text-left p-3.5 flex items-start space-x-3 transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div className="relative shrink-0">
                      {chat.type === 'channel' ? (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-lg shadow-xs">
                          <Hash className="w-5 h-5" />
                        </div>
                      ) : chat.type === 'group' ? (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shadow-xs">
                          <Users className="w-5 h-5" />
                        </div>
                      ) : chat.avatarUrl ? (
                        <img
                          src={chat.avatarUrl}
                          alt={chat.name || 'Chat'}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-base shadow-xs">
                          {chat.name ? chat.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                      )}
                      {chat.type === 'direct' && isUserOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 truncate">
                          {chat.type === 'channel' && <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <h3 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {chat.name || 'Conversation'}
                          </h3>
                        </div>
                        {chat.lastMessage && (
                          <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                            {formatMessageTime(chat.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">
                          {chat.lastMessage?.content ? (
                            chat.lastMessage.content.startsWith('{') &&
                            chat.lastMessage.content.includes('"e2ee":true') ? (
                              '🔒 Encrypted message'
                            ) : (
                              chat.lastMessage.content
                            )
                          ) : (
                            <span className="italic text-slate-400">No messages yet</span>
                          )}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: Active Conversation View */}
        <section
          role="region"
          aria-label="Active conversation"
          className={`flex-1 flex flex-col bg-slate-100/60 dark:bg-slate-950 overflow-hidden ${
            activeChat ? 'flex' : 'hidden sm:flex'
          }`}
        >
          {activeChat ? (
            <>
              {/* Active Chat Header */}
              <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  {/* Mobile Back Button to conversation list */}
                  <button
                    type="button"
                    onClick={() => void selectChat(null)}
                    className="sm:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    {activeChat.type === 'channel' ? (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold shadow-xs">
                        <Hash className="w-5 h-5" />
                      </div>
                    ) : activeChat.type === 'group' ? (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : activeChat.avatarUrl ? (
                      <img
                        src={activeChat.avatarUrl}
                        alt={activeChat.name || ''}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                        {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    {activeChat.type === 'direct' &&
                      activeChat.otherUser &&
                      onlineUsers[activeChat.otherUser.id]?.status === 'online' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      {activeChat.type === 'channel' && (
                        <span className="font-bold text-indigo-500 text-sm">#</span>
                      )}
                      <h2 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {activeChat.name}
                      </h2>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1.5">
                      {activeTyping.length > 0 ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                          {activeTyping.length === 1
                            ? `${activeTyping[0]} is typing...`
                            : `${activeTyping.slice(0, 2).join(', ')} are typing...`}
                        </span>
                      ) : activeChat.type === 'channel' ? (
                        <>
                          <span className="flex items-center space-x-1">
                            {activeChat.isPublic ? (
                              <Globe className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Lock className="w-3 h-3 text-amber-500" />
                            )}
                            <span>{activeChat.isPublic ? 'Public' : 'Private'} Channel</span>
                          </span>
                          <span>&bull;</span>
                          <span>{activeGroupDetails?.membersCount || 1} members</span>
                        </>
                      ) : activeChat.type === 'group' ? (
                        <>
                          <span>Group Conversation</span>
                          <span>&bull;</span>
                          <span>{activeGroupDetails?.membersCount || 1} members</span>
                        </>
                      ) : activeChat.otherUser ? (
                        <>
                          <span>@{activeChat.otherUser.username}</span>
                          <span>&bull;</span>
                          {onlineUsers[activeChat.otherUser.id]?.status === 'online' ? (
                            <span className="text-emerald-500 font-medium">Online</span>
                          ) : (
                            <span className="text-slate-400">Offline</span>
                          )}
                        </>
                      ) : (
                        <span>Direct Chat</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleInChatSearch()}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      inChatSearchOpen
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Search in conversation"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  {activeChat.type === 'direct' && activeChat.otherUser && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void startCall({
                            recipientId: activeChat.otherUser!.id,
                            recipientName: activeChat.otherUser!.displayName || activeChat.otherUser!.username,
                            recipientAvatar: activeChat.otherUser!.avatarUrl,
                            chatId: activeChat.id,
                            callType: 'audio',
                          })
                        }
                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void startCall({
                            recipientId: activeChat.otherUser!.id,
                            recipientName: activeChat.otherUser!.displayName || activeChat.otherUser!.username,
                            recipientAvatar: activeChat.otherUser!.avatarUrl,
                            chatId: activeChat.id,
                            callType: 'video',
                          })
                        }
                        className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {activeChat.type === 'direct' && activeChat.otherUser && (
                    <button
                      type="button"
                      onClick={() =>
                        void openSafetyNumberModal(
                          activeChat.otherUser!.id,
                          activeChat.otherUser!.displayName || activeChat.otherUser!.username,
                        )
                      }
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer"
                      title="End-to-End Encrypted (Click to verify safety number)"
                    >
                      <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">E2EE</span>
                    </button>
                  )}
                  {activeChat.type === 'direct' && activeChat.otherUser ? (
                    <button
                      onClick={() => handleInspectOtherUser(activeChat.otherUser!.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="View Profile"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowGroupDrawer(!showGroupDrawer)}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        showGroupDrawer
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Group Details & Members"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* In-Chat Search Bar */}
              {inChatSearchOpen && (
                <InChatSearchBar
                  chatId={activeChat.id}
                  onSelectMessage={(msgId) => {
                    const el = document.getElementById(`msg-${msgId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2');
                      setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2'), 2500);
                    }
                  }}
                />
              )}

              {/* Messages History Container */}
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
              >
                {isLoadingMessages && currentMessages.length === 0 ? (
                  <MessagesSkeleton count={7} />
                ) : currentMessages.length === 0 ? (
                  <div className="py-16 text-center max-w-sm mx-auto">
                    <EmptyState
                      icon={<Sparkles className="w-8 h-8" />}
                      title="Beginning of this conversation"
                      description="Send a message or share an attachment to begin chatting in this encrypted workspace."
                    />
                  </div>
                ) : (
                  currentMessages.map((msg, index) => {
                    const isMe = msg.senderId === user?.id;
                    const prevMsg = index > 0 ? currentMessages[index - 1] : null;
                    const showDateDivider =
                      !prevMsg ||
                      new Date(prevMsg.createdAt).toDateString() !==
                        new Date(msg.createdAt).toDateString();

                    const attachments = msg.attachments || [];

                    return (
                      <div key={msg.id} className="space-y-3">
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-4">
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-2xs">
                              {formatDateHeader(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex items-end space-x-2 ${
                            isMe ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!isMe && (
                            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300 shrink-0 mb-1">
                              {msg.sender.avatarUrl ? (
                                <img
                                  src={msg.sender.avatarUrl}
                                  alt={msg.sender.displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>
                                  {msg.sender.displayName
                                    ? msg.sender.displayName.charAt(0).toUpperCase()
                                    : 'U'}
                                </span>
                              )}
                            </div>
                          )}

                          <div id={`msg-${msg.id}`} className="relative group max-w-xs sm:max-w-md md:max-w-lg transition-all rounded-2xl">
                            {/* Hover Quick Reaction Bar */}
                            {/* Quick Reactions & Actions Hover Bar */}
                            <div
                              className={`absolute -top-3.5 ${
                                isMe ? 'right-2' : 'left-2'
                              } hidden group-hover:flex items-center space-x-1 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 z-10 transition`}
                            >
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => void toggleReaction(msg.id, emoji)}
                                  className="w-6 h-6 flex items-center justify-center hover:scale-125 transition-transform text-xs"
                                  title={`React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                              <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(msg);
                                  messageInputRef.current?.focus();
                                }}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                title="Reply"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              {isMe && Date.now() - new Date(msg.createdAt).getTime() < 15 * 60 * 1000 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessage(msg);
                                    setMessageInput(msg.content);
                                    messageInputRef.current?.focus();
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                                  title="Edit (within 15m)"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeletingMessage(msg)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Message Bubble Body */}
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm shadow-2xs ${
                                isMe
                                  ? 'bg-indigo-600 text-white rounded-br-xs'
                                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                              }`}
                            >
                              {!isMe && (
                                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                                  {msg.sender.displayName}
                                </p>
                              )}

                              {/* Quoted Reply Preview */}
                              {msg.replyTo && (
                                <div
                                  className={`mb-2 p-2 rounded-xl border-l-3 text-xs ${
                                    isMe
                                      ? 'bg-indigo-700/60 border-indigo-300 text-indigo-100'
                                      : 'bg-slate-100 dark:bg-slate-800/80 border-indigo-500 text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  <p className="font-semibold text-[11px] text-indigo-300 dark:text-indigo-400">
                                    {msg.replyTo.sender.displayName || msg.replyTo.sender.username}
                                  </p>
                                  <p className="truncate text-[11px] opacity-90">
                                    {msg.replyTo.content || `[${msg.replyTo.type}]`}
                                  </p>
                                </div>
                              )}

                              {/* Render Attachments */}
                              {attachments.length > 0 && (
                                <div className="space-y-2 mb-1.5">
                                  {attachments.map((att) => {
                                    const isImg = att.mimeType.startsWith('image/');
                                    const isVid = att.mimeType.startsWith('video/');
                                    const isAud = att.mimeType.startsWith('audio/');

                                    if (isImg) {
                                      return (
                                        <div
                                          key={att.id}
                                          onClick={() => setLightboxImageUrl(att.publicUrl)}
                                          className="cursor-pointer overflow-hidden rounded-xl group/img relative border border-black/10 dark:border-white/10"
                                        >
                                          <img
                                            src={att.publicUrl}
                                            alt={att.fileName}
                                            className="max-h-64 rounded-xl object-contain bg-black/5 dark:bg-black/30 group-hover/img:scale-[1.01] transition duration-200"
                                          />
                                        </div>
                                      );
                                    }

                                    if (isVid) {
                                      return (
                                        <video
                                          key={att.id}
                                          src={att.publicUrl}
                                          controls
                                          className="max-h-64 rounded-xl w-full bg-black/80"
                                        />
                                      );
                                    }

                                    if (isAud) {
                                      return (
                                        <div key={att.id} className="pt-1">
                                          <audio src={att.publicUrl} controls className="w-full h-9" />
                                        </div>
                                      );
                                    }

                                    // Document or archive
                                    return (
                                      <div
                                        key={att.id}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border ${
                                          isMe
                                            ? 'bg-indigo-700/60 border-indigo-500/50 text-white'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                                          <FileText className="w-6 h-6 shrink-0 opacity-80" />
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold truncate leading-tight">
                                              {att.fileName}
                                            </p>
                                            <p className="text-[10px] opacity-75 mt-0.5">
                                              {formatFileSize(att.fileSize)}
                                            </p>
                                          </div>
                                        </div>
                                        <a
                                          href={att.publicUrl}
                                          download={att.fileName}
                                          className={`p-1.5 rounded-lg transition shrink-0 ${
                                            isMe
                                              ? 'hover:bg-white/20 text-white'
                                              : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                                          }`}
                                          title="Download"
                                        >
                                          <Download className="w-4 h-4" />
                                        </a>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Text Content */}
                              {msg.content && (
                                <DecryptedText
                                  content={msg.content}
                                  senderId={msg.senderId || ''}
                                  isMe={isMe}
                                />
                              )}

                              <div
                                className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
                                  isMe ? 'text-indigo-200' : 'text-slate-400'
                                }`}
                              >
                                {msg.isEdited && (
                                  <span className="opacity-75 italic text-[9px] mr-1">(edited)</span>
                                )}
                                <span>{formatMessageTime(msg.createdAt)}</span>
                                {isMe && (
                                  <span title={msg.status || 'sent'} className="inline-flex items-center">
                                    {msg.status === 'read' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-300 drop-shadow-xs" />
                                    ) : msg.status === 'delivered' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-indigo-200/90" />
                                    ) : msg.status === 'sending' ? (
                                      <Clock className="w-3 h-3 text-indigo-200 animate-spin" />
                                    ) : msg.status === 'failed' ? (
                                      <span className="flex items-center text-rose-300 text-[10px] space-x-0.5">
                                        <AlertTriangle className="w-3 h-3 text-rose-300" />
                                        <span>Failed</span>
                                      </span>
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-indigo-200/70" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Message Reaction Chips */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div
                                className={`flex flex-wrap gap-1 mt-1 ${
                                  isMe ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                {msg.reactions.map((rx) => (
                                  <button
                                    key={rx.emoji}
                                    type="button"
                                    onClick={() => void toggleReaction(msg.id, rx.emoji)}
                                    title={
                                      rx.users && rx.users.length > 0
                                        ? rx.users.map((u) => u.displayName || u.username).join(', ')
                                        : rx.emoji
                                    }
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition border cursor-pointer ${
                                      rx.hasReacted
                                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <span>{rx.emoji}</span>
                                    <span className="text-[11px] font-medium">{rx.count}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Real-time Typing Bubble */}
                {activeTyping.length > 0 && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium py-1 px-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <span className="flex space-x-1.5 items-center bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                      <span className="ml-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {activeTyping.length === 1
                          ? `${activeTyping[0]} is typing...`
                          : `${activeTyping.slice(0, 2).join(', ')} are typing...`}
                      </span>
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0 relative">
                {/* Replying banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center space-x-2 truncate">
                      <Reply className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                          Replying to {replyingTo.sender.displayName}:
                        </span>{' '}
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {replyingTo.content || '[Attachment]'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Editing banner */}
                {editingMessage && (
                  <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center space-x-2 truncate">
                      <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          Editing message:
                        </span>{' '}
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {editingMessage.content}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null);
                        setMessageInput('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-18 left-3 sm:left-4 z-30 w-72 sm:w-80 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex space-x-1">
                        {(['smileys', 'gestures', 'hearts', 'objects'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEmojiCategory(cat)}
                            className={`px-2 py-1 text-xs rounded-lg font-medium transition ${
                              emojiCategory === cat
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-semibold'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {cat === 'smileys'
                              ? '😀'
                              : cat === 'gestures'
                              ? '👍'
                              : cat === 'hearts'
                              ? '❤️'
                              : '🎉'}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1 text-xl">
                      {EMOJI_SETS[emojiCategory].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-120 transition"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staged Attachment Preview */}
                {stagedFile && (
                  <div className="mb-2 p-2 px-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between animate-in fade-in duration-150">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {stagedPreviewUrl ? (
                        <img
                          src={stagedPreviewUrl}
                          alt="preview"
                          className="w-9 h-9 rounded-lg object-cover border border-indigo-300"
                        />
                      ) : stagedFile.type.startsWith('video/') ? (
                        <Film className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : stagedFile.type.startsWith('audio/') ? (
                        <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {stagedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatFileSize(stagedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearStagedFile}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/40"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                  />

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isUploadingMedia}
                    className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                    title="Attach file or photo"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Emoji Picker Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={isSending || isUploadingMedia}
                    className={`p-2.5 rounded-xl transition shrink-0 ${
                      showEmojiPicker
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Insert emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  <input
                    ref={messageInputRef}
                    type="text"
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        if (editingMessage) {
                          setEditingMessage(null);
                          setMessageInput('');
                        }
                        if (replyingTo) {
                          setReplyingTo(null);
                        }
                      }
                    }}
                    placeholder={
                      editingMessage
                        ? 'Editing message... (Press Enter to save, Esc to cancel)'
                        : activeChat.type === 'channel'
                        ? `Message #${activeChat.name}...`
                        : activeChat.type === 'group'
                        ? `Message ${activeChat.name}...`
                        : 'Type a message... (Press Enter to send)'
                    }
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && !stagedFile) || isSending || isUploadingMedia}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition shrink-0"
                    title="Send Message"
                  >
                    {isUploadingMedia ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State when no chat is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Your Whispr Hub
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                Select a conversation on the left, start a new group or channel, or share media with
                friends.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Group / Channel</span>
                </button>
                <button
                  onClick={() => setShowChannelBrowserModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Channels</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Group Details Right Drawer */}
        <GroupDetailsDrawer
          isOpen={
            showGroupDrawer &&
            Boolean(activeChat && (activeChat.type === 'group' || activeChat.type === 'channel'))
          }
          onClose={() => setShowGroupDrawer(false)}
        />
      </div>

      {/* Lightbox Image Preview Modal */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImageUrl}
              alt="Enlarged media"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 shadow-md"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <UserProfileModal profile={viewingProfile} onClose={clearViewingProfile} />
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
      />
      <ChannelBrowserModal
        isOpen={showChannelBrowserModal}
        onClose={() => setShowChannelBrowserModal(false)}
      />
      {/* Delete Message Confirmation Modal */}
      {deletingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Delete Message</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose how to delete this message</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteConfirm('me')}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition text-left flex items-center justify-between cursor-pointer"
              >
                <span>Delete for me</span>
                <span className="text-[10px] text-slate-400">Hides on this device</span>
              </button>

              {(deletingMessage.senderId === user?.id ||
                activeGroupDetails?.callerRole === 'owner' ||
                activeGroupDetails?.callerRole === 'admin') && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteConfirm('everyone')}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition text-left flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <span>Delete for everyone</span>
                  <span className="text-[10px] text-rose-100">Deletes for all participants</span>
                </button>
              )}
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingMessage(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Global Spotlight Search Modal */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />

      {/* WebRTC Active Call Overlay */}
      <CallModal />

      {/* Call History / Logs Modal */}
      <CallHistoryModal
        isOpen={showCallHistoryModal}
        onClose={() => setShowCallHistoryModal(false)}
        onStartCall={(params) => void startCall(params)}
      />

      {/* Signal Protocol Safety Number Verification Modal */}
      <SafetyNumberModal />

      {/* In-App Notification Center Panel */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => toggleNotificationCenter(false)}
      />
    </div>
  );
}
