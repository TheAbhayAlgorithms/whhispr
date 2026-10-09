import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Bubble,
  BubbleContent,
} from '@/components/ui/bubble';
import {
  Message,
  MessageAvatar,
  MessageContent,
} from '@/components/ui/message';
import WarmTooltip, { WarmTooltipGroup } from '@/components/ui/WarmTooltip';
import { WireframeGlobeAnimation } from '../components/WireframeGlobeAnimation';
import { resolveApiUrl } from '../lib/api';
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
  Smile,
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
  Menu,
  Pin,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
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
  const [searchParams, setSearchParams] = useSearchParams();
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
    fetchMessages,
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
    togglePinChat,
    isChatPinned,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileActionsMenu, setShowMobileActionsMenu] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'direct' | 'group' | 'pinned'>('all');
  const [photosExpanded, setPhotosExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [linksExpanded, setLinksExpanded] = useState(false);

  // Synchronize URL search param `?chat=id` with activeChatId for back navigation
  const urlChatId = searchParams.get('chat');
  useEffect(() => {
    if (urlChatId && urlChatId !== activeChatId) {
      void selectChat(urlChatId);
    } else if (!urlChatId && activeChatId && typeof window !== 'undefined' && window.innerWidth < 768) {
      void selectChat(null);
    }
  }, [urlChatId, activeChatId, selectChat]);

  const handleSelectChat = (chatId: string | null) => {
    if (chatId) {
      setSearchParams({ chat: chatId });
    } else {
      setSearchParams({});
    }
    void selectChat(chatId);
  };

  // Viewport resize handling for on-screen keyboards
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewport = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty(
          '--app-dvh',
          `${window.visualViewport.height}px`
        );
      }
    };
    window.visualViewport.addEventListener('resize', handleViewport);
    window.visualViewport.addEventListener('scroll', handleViewport);
    handleViewport();
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewport);
      window.visualViewport?.removeEventListener('scroll', handleViewport);
    };
  }, []);

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

  // Real-time synchronization polling (syncs Supabase messages & chats automatically even when WebSockets are disconnected/serverless)
  useEffect(() => {
    if (!activeChatId) return;

    void fetchMessages(activeChatId);

    const interval = setInterval(() => {
      void fetchMessages(activeChatId);
      void fetchChats();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChatId, fetchMessages, fetchChats]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
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

  const rawChatsList = Array.isArray(chats) ? chats : [];
  const seenDirectUsers = new Set<string>();
  const chatsList = rawChatsList.filter((c) => {
    if (c.type !== 'direct' || !c.otherUser?.id) return true;
    if (seenDirectUsers.has(c.otherUser.id)) return false;
    seenDirectUsers.add(c.otherUser.id);
    return true;
  });
  const activeChat = chatsList.find((c) => c.id === activeChatId);
  const currentMessages = activeChatId ? messages[activeChatId] || [] : [];
  const activeTyping = (activeChatId ? typingUsers[activeChatId] || [] : []).filter(
    (name) => name !== user?.username && name !== user?.displayName,
  );

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

  // Sync presence when window/tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const socket = getSocket();
        if (socket.connected) {
          const directUserIds = chatsList
            .filter((c) => c.type === 'direct' && c.otherUser?.id)
            .map((c) => c.otherUser!.id);
          if (directUserIds.length > 0) {
            void useSocketStore.getState().queryBatchPresence(directUserIds);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [chatsList]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);
    if (activeChatId) {
      const socket = getSocket();
      if (socket.connected) {
        if (!val.trim()) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          socket.emit('typing:stop', { chatId: activeChatId });
        } else {
          socket.emit('typing:start', { chatId: activeChatId });
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { chatId: activeChatId });
            typingTimeoutRef.current = null;
          }, 2500);
        }
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

  const filteredChats = chatsList
    .filter((chat) => {
      if (categoryFilter === 'direct' && chat.type !== 'direct') return false;
      if (categoryFilter === 'group' && chat.type !== 'group' && chat.type !== 'channel') return false;
      if (categoryFilter === 'pinned' && !isChatPinned(chat.id)) return false;

      if (!chatSearch.trim()) return true;
      const query = chatSearch.toLowerCase();
      const nameMatch = chat.name?.toLowerCase().includes(query);
      const userMatch = chat.otherUser?.username.toLowerCase().includes(query);
      return Boolean(nameMatch || userMatch);
    })
    .sort((a, b) => {
      const aPinned = isChatPinned(a.id);
      const bPinned = isChatPinned(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const photoAttachments = currentMessages.flatMap((m) =>
    (m.attachments || []).filter((a) => a.mimeType?.startsWith('image/')),
  );
  const fileAttachments = currentMessages.flatMap((m) =>
    (m.attachments || []).filter((a) => !a.mimeType?.startsWith('image/')),
  );
  const linkMatches = currentMessages.flatMap((m) => {
    const matches = m.content?.match(/https?:\/\/[^\s]+/g);
    return matches || [];
  });

  const handleVoiceCall = () => {
    if (!activeChat) return;
    if (activeChat.type === 'direct' && activeChat.otherUser) {
      void startCall({
        recipientId: activeChat.otherUser.id,
        recipientName: activeChat.otherUser.displayName || activeChat.otherUser.username,
        recipientAvatar: activeChat.otherUser.avatarUrl,
        chatId: activeChat.id,
        callType: 'audio',
      });
    } else if (activeGroupDetails?.members && activeGroupDetails.members.length > 0) {
      const target = activeGroupDetails.members.find((m) => m.id !== user?.id) || activeGroupDetails.members[0];
      if (target) {
        void startCall({
          recipientId: target.id,
          recipientName: activeChat.name || target.displayName || target.username,
          recipientAvatar: activeChat.avatarUrl || target.avatarUrl,
          chatId: activeChat.id,
          callType: 'audio',
        });
      }
    }
  };

  const handleVideoCall = () => {
    if (!activeChat) return;
    if (activeChat.type === 'direct' && activeChat.otherUser) {
      void startCall({
        recipientId: activeChat.otherUser.id,
        recipientName: activeChat.otherUser.displayName || activeChat.otherUser.username,
        recipientAvatar: activeChat.otherUser.avatarUrl,
        chatId: activeChat.id,
        callType: 'video',
      });
    } else if (activeGroupDetails?.members && activeGroupDetails.members.length > 0) {
      const target = activeGroupDetails.members.find((m) => m.id !== user?.id) || activeGroupDetails.members[0];
      if (target) {
        void startCall({
          recipientId: target.id,
          recipientName: activeChat.name || target.displayName || target.username,
          recipientAvatar: activeChat.avatarUrl || target.avatarUrl,
          chatId: activeChat.id,
          callType: 'video',
        });
      }
    }
  };

  return (
    <div className="h-screen h-dvh bg-slate-100 dark:bg-[#121316] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-200">
      {/* Top Navbar Only */}
      <WarmTooltipGroup delay={200} warmWindow={300} travel={220} lean={0}>
        <header className="h-16 w-full border-b border-slate-200/80 dark:border-[#242630] bg-white/95 dark:bg-[#18191E]/95 backdrop-blur-md px-3 sm:px-5 lg:px-6 flex items-center justify-between shrink-0 z-30 select-none shadow-xs">
          {/* Left: Brand & Status */}
          <div className="flex items-center space-x-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => void handleSelectChat(null)}
              className="flex items-center space-x-2.5 group cursor-pointer focus:outline-none"
              aria-label="Whhispr Home"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 active:scale-95 transition shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Whhispr
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 hidden sm:inline">
                  Secure Messaging
                </span>
              </div>
            </button>

            {/* Real-time Socket Connection Badge */}
            {socketStatus === 'connected' ? (
              <span
                title="Socket Connected (Live)"
                className="hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium items-center shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse shrink-0" />
                <span>Live</span>
              </span>
            ) : socketStatus === 'connecting' ? (
              <span
                title="Socket Connecting..."
                className="hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium items-center shrink-0"
              >
                <Radio className="w-3 h-3 mr-1 animate-spin text-amber-500 shrink-0" />
                <span>Connecting...</span>
              </span>
            ) : (
              <span
                title="Socket Disconnected (Offline)"
                className="hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 font-medium items-center shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 shrink-0" />
                <span>Offline</span>
              </span>
            )}
          </div>

          {/* Center: Main Navigation Links (Desktop/Tablet md+) */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {/* Chats Pill */}
            <WarmTooltip content="Conversations" shortcut="⌘1" side="bottom">
              <button
                type="button"
                onClick={() => void handleSelectChat(null)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 ${
                  !activeChat
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0066FF] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-[#0066FF] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#161622]'
                }`}
                aria-label="Conversations"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Chats</span>
              </button>
            </WarmTooltip>

            {/* Calls */}
            <WarmTooltip content="Call History" side="bottom">
              <button
                type="button"
                onClick={() => setShowCallHistoryModal(true)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#0066FF] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#161622] transition cursor-pointer active:scale-95"
                aria-label="Call History"
              >
                <PhoneCall className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Calls</span>
              </button>
            </WarmTooltip>

            {/* Contacts */}
            <WarmTooltip content="Contacts" shortcut="⌘2" side="bottom">
              <Link
                to="/contacts"
                className="relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#0066FF] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#161622] transition active:scale-95"
                aria-label="Contacts"
              >
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Contacts</span>
                {incomingRequests.length > 0 && (
                  <span className="px-1.5 min-w-[16px] h-4 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 flex items-center justify-center">
                    {incomingRequests.length}
                  </span>
                )}
              </Link>
            </WarmTooltip>

            {/* Explore Channels */}
            <WarmTooltip content="Explore Channels" shortcut="⌘3" side="bottom">
              <button
                type="button"
                onClick={() => setShowChannelBrowserModal(true)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#0066FF] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#161622] transition cursor-pointer active:scale-95"
                aria-label="Explore Channels"
              >
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Explore</span>
              </button>
            </WarmTooltip>
          </nav>

          {/* Right: Tools, Theme Toggle, Profile, Sign Out */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Global Search Trigger */}
            <WarmTooltip content="Search messages & contacts" shortcut="⌘K" side="bottom">
              <button
                type="button"
                onClick={() => setShowGlobalSearch(true)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161622] dark:hover:bg-[#1E1E2C] border border-slate-200 dark:border-[#222232] text-blue-600 dark:text-blue-400 flex items-center justify-center transition cursor-pointer active:scale-95"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </WarmTooltip>

            {/* Notifications Bell */}
            <WarmTooltip content="Notifications" shortcut="⌘4" side="bottom">
              <button
                type="button"
                onClick={() => toggleNotificationCenter()}
                className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161622] dark:hover:bg-[#1E1E2C] border border-slate-200 dark:border-[#222232] text-blue-600 dark:text-blue-400 flex items-center justify-center transition cursor-pointer active:scale-95"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            </WarmTooltip>

            {/* Settings Link (Desktop) */}
            <div className="hidden sm:block">
              <WarmTooltip content="Settings" shortcut="⌘," side="bottom">
                <Link
                  to="/settings"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161622] dark:hover:bg-[#1E1E2C] border border-slate-200 dark:border-[#222232] text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition active:scale-95"
                  aria-label="Settings"
                >
                  <SettingsIcon className="w-4 h-4" />
                </Link>
              </WarmTooltip>
            </div>

            {/* Admin Portal (if admin) */}
            {user?.role === 'admin' && (
              <div className="hidden sm:block">
                <WarmTooltip content="Admin Portal" shortcut="⌘A" side="bottom">
                  <Link
                    to="/admin"
                    className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center transition active:scale-95"
                    aria-label="Admin Portal"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                </WarmTooltip>
              </div>
            )}

            {/* Daylight / Dark Theme Toggle Button */}
            <WarmTooltip content="Toggle Theme" side="bottom">
              <div>
                <ThemeToggle size="sm" />
              </div>
            </WarmTooltip>

            {/* User Profile Avatar with socket live indicator */}
            <WarmTooltip content={user?.displayName || 'Your Profile'} shortcut="⌘P" side="bottom">
              <button
                type="button"
                onClick={() => user && fetchUserProfile(user.id)}
                className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500/40 hover:border-blue-500 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                aria-label={`${user?.displayName} (@${user?.username})`}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#0066FF] text-white font-bold flex items-center justify-center text-xs">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </button>
            </WarmTooltip>

            {/* Sign Out (Desktop) */}
            <div className="hidden sm:block">
              <WarmTooltip content="Sign Out" shortcut="⌥Q" side="bottom">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-[#161622] dark:hover:bg-rose-950/30 border border-slate-200 dark:border-[#222232] text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </WarmTooltip>
            </div>

            {/* Mobile Menu Dropdown Toggle (< md) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161622] dark:hover:bg-[#1E1E2C] border border-slate-200 dark:border-[#222232] text-blue-600 dark:text-blue-400 transition flex items-center justify-center shrink-0 active:scale-95"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <CloseIcon className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Mobile Dropdown Menu (< md) */}
          {mobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed top-16 right-3 z-50 w-72 max-w-[calc(100vw-24px)] bg-white dark:bg-[#0D0D14] border border-slate-200 dark:border-[#1E1E2A] rounded-2xl shadow-2xl p-2.5 flex flex-col md:hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 origin-top-right max-h-[calc(100dvh-4.5rem)] overflow-y-auto">
                {/* User Profile Card */}
                <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#161622] border border-slate-100 dark:border-[#222232]">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 dark:bg-[#1E1E2C] border-2 border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300 shrink-0">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      @{user?.username}
                    </p>
                  </div>
                  {user?.role === 'admin' && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md shrink-0">
                      Admin
                    </span>
                  )}
                </div>

                {/* Daylight Theme Toggle Row */}
                <div className="mt-2 px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-[#161622]/60 border border-slate-100/80 dark:border-[#222232] flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Theme</span>
                  <ThemeToggle showLabel={true} />
                </div>

                {/* Menu Links */}
                <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-[#1E1E2A] space-y-0.5">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowCallHistoryModal(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161622] transition text-left active:scale-[0.99]"
                  >
                    <PhoneCall className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Calls</span>
                  </button>

                  <Link
                    to="/contacts"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161622] transition active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Contacts</span>
                    </div>
                    {incomingRequests.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        {incomingRequests.length}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowChannelBrowserModal(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161622] transition text-left active:scale-[0.99]"
                  >
                    <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Explore Channels</span>
                  </button>

                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161622] transition active:scale-[0.99]"
                  >
                    <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161622] transition active:scale-[0.99]"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Settings</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition active:scale-[0.99]"
                    >
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Admin Portal</span>
                    </Link>
                  )}
                </div>

                {/* Sign Out Button */}
                <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-[#1E1E2A]">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void handleLogout();
                    }}
                    disabled={loggingOut}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition active:scale-[0.99]"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </header>
      </WarmTooltipGroup>

      {/* Real-time offline and reconnect status bar */}
      <OfflineBanner />

        {/* Main Two-Panel Chat Workspace (Floated / Docked rounded cards on desktop) */}
        <div className="flex-1 flex overflow-hidden p-0 md:p-3 md:gap-3 bg-slate-100 dark:bg-[#121316]">
          {/* SLIM LEFT RAIL (Matching Image 1) */}
          <div className="hidden md:flex flex-col items-center justify-between py-4 px-2 w-16 bg-white dark:bg-[#18191E] md:rounded-3xl border border-slate-200/80 dark:border-[#242630] shrink-0 select-none shadow-sm md:shadow-md">
            {/* Top: Brand Mark & Category Filter Pills */}
            <div className="flex flex-col items-center space-y-3 w-full">
              <div
                onClick={() => setCategoryFilter('all')}
                className="w-10 h-10 rounded-2xl bg-[#0066FF] dark:bg-[#242630] border border-blue-400/20 dark:border-[#30323E] flex items-center justify-center text-white dark:text-[#E2F952] font-black text-lg shadow-sm cursor-pointer hover:scale-105 transition"
                title="Whhispr Home"
              >
                S
              </div>

              <div className="flex flex-col items-center space-y-2 pt-1 w-full">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`w-10 h-9 rounded-2xl text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-blue-50 dark:bg-[#2E303D] text-[#0066FF] dark:text-[#E2F952] border border-blue-200 dark:border-[#3B3D4D] shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#242630]'
                  }`}
                  title="All Chats"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('direct')}
                  className={`w-10 h-9 rounded-2xl text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                    categoryFilter === 'direct'
                      ? 'bg-blue-50 dark:bg-[#2E303D] text-[#0066FF] dark:text-[#E2F952] border border-blue-200 dark:border-[#3B3D4D] shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#242630]'
                  }`}
                  title="Direct Messages"
                >
                  DM
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('group')}
                  className={`w-10 h-9 rounded-2xl text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                    categoryFilter === 'group'
                      ? 'bg-blue-50 dark:bg-[#2E303D] text-[#0066FF] dark:text-[#E2F952] border border-blue-200 dark:border-[#3B3D4D] shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#242630]'
                  }`}
                  title="Groups & Channels"
                >
                  GRP
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('pinned')}
                  className={`w-10 h-9 rounded-2xl text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                    categoryFilter === 'pinned'
                      ? 'bg-blue-50 dark:bg-[#2E303D] text-[#0066FF] dark:text-[#E2F952] border border-blue-200 dark:border-[#3B3D4D] shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#242630]'
                  }`}
                  title="Pinned Chats"
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowChannelBrowserModal(true)}
                  className="w-10 h-9 rounded-2xl text-[11px] font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#242630] transition flex items-center justify-center cursor-pointer"
                  title="Explore Channels"
                >
                  <Compass className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom: Bright lime + button matching Image 1 */}
            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="w-10 h-10 rounded-full bg-[#E2F952] hover:bg-[#d6ee3c] text-black font-bold flex items-center justify-center transition shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              title="Create Group or Channel"
            >
              <Plus className="w-5 h-5 text-black stroke-[2.5]" />
            </button>
          </div>

          {/* LEFT PANEL: Chats Sidebar */}
          <aside
            role="region"
            aria-label="Conversations list"
            className={`w-full md:w-80 lg:w-88 xl:w-92 md:rounded-3xl border border-slate-200/80 dark:border-[#242630] bg-white dark:bg-[#18191E] flex flex-col shrink-0 overflow-hidden shadow-sm md:shadow-xl ${
              activeChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Sidebar Top Actions & Search */}
            <div className="p-3.5 border-b border-slate-200/80 dark:border-[#242630] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  {categoryFilter === 'all'
                    ? 'All Chats'
                    : categoryFilter === 'direct'
                    ? 'Direct Messages'
                    : categoryFilter === 'group'
                    ? 'Groups & Channels'
                    : 'Pinned Chats'}
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setShowCallHistoryModal(true)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#242630] dark:hover:bg-[#2F313E] text-slate-700 dark:text-zinc-200 text-xs font-semibold shadow-xs transition"
                    title="View Call History"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#E2F952]" />
                    <span>Calls</span>
                  </button>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#0066FF] hover:bg-blue-600 dark:bg-[#E2F952] dark:hover:bg-[#d6ee3c] text-white dark:text-black text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                    title="Create Group or Channel"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New</span>
                  </button>
                </div>
              </div>

              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search..."
                  aria-label="Search conversations"
                  className="w-full pl-9 pr-10 sm:pr-14 py-2 bg-slate-100 dark:bg-[#121316] border border-slate-200 dark:border-[#262833] rounded-full text-base sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B95F6] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowGlobalSearch(true)}
                  title="Global Search (⌘K)"
                  aria-label="Global Search"
                  className="hidden sm:inline-flex absolute right-2.5 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#20202E] text-[10px] font-mono font-medium text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-[#8B95F6] transition"
                >
                  ⌘K
                </button>
              </div>
            </div>

            {/* Chats Scroll List with distinct spaces between each chat card matching Image 1 */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2.5"
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
                      description="Connect with contacts or explore public channels to begin chatting securely on Whhispr!"
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
                  const isPinned = isChatPinned(chat.id);

                  return (
                    <div
                      key={chat.id}
                      onClick={() => void handleSelectChat(chat.id)}
                      className={`w-full text-left p-3 rounded-2xl flex items-center space-x-3.5 transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-[#252734] border border-[#0066FF]/40 dark:border-[#8B95F6]/40 shadow-md ring-1 ring-[#0066FF]/20 dark:ring-[#8B95F6]/25'
                          : 'bg-slate-50 dark:bg-[#1C1D23] hover:bg-slate-100 dark:hover:bg-[#25262E] border border-slate-200/60 dark:border-[#282935]/70 hover:border-slate-300 dark:hover:border-[#383A4A]'
                      }`}
                    >
                      {/* Avatar Icon with Real-Time Online Dot marked directly on profile */}
                      <div className="relative shrink-0">
                        {chat.type === 'channel' ? (
                          <div className="w-12 h-12 rounded-full bg-blue-500/10 dark:bg-[#242632] border border-blue-500/20 dark:border-[#303240] text-blue-600 dark:text-[#8B95F6] flex items-center justify-center font-bold text-base shadow-xs">
                            <Hash className="w-5 h-5" />
                          </div>
                        ) : chat.type === 'group' ? (
                          <div className="w-12 h-12 rounded-full bg-blue-500/10 dark:bg-[#242632] border border-blue-500/20 dark:border-[#303240] text-blue-600 dark:text-[#E2F952] flex items-center justify-center font-bold text-base shadow-xs">
                            <Users className="w-5 h-5" />
                          </div>
                        ) : chat.avatarUrl ? (
                          <img
                            src={chat.avatarUrl}
                            alt={chat.name || 'Chat'}
                            className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-[#2E303E]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#0066FF] dark:bg-[#2E3140] border border-blue-400/20 dark:border-[#3B3E52] flex items-center justify-center text-white dark:text-zinc-100 font-bold text-base shadow-xs">
                            {chat.name ? chat.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                        )}
                        {/* Real-time Online Dot marked on the profile as in Image 1 */}
                        {chat.type === 'direct' && isUserOnline && (
                          <span
                            title="Online"
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#E2F952] border-2 border-white dark:border-[#1C1D23] shadow-xs"
                          />
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center space-x-1.5 truncate">
                            {chat.type === 'channel' && <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 truncate">
                              {chat.name || 'Conversation'}
                            </h3>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                            {isPinned && (
                              <span title="Pinned">
                                <Pin className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#E2F952] fill-current shrink-0" />
                              </span>
                            )}
                            {chat.lastMessage && (
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                                {formatMessageTime(chat.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtitle preview without offline text clutter */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500 dark:text-zinc-400 truncate pr-2">
                            {(typingUsers[chat.id] || []).filter(
                              (name) => name !== user?.username && name !== user?.displayName,
                            ).length > 0 ? (
                              <span className="text-blue-600 dark:text-[#8B95F6] font-semibold animate-pulse">
                                typing...
                              </span>
                            ) : chat.lastMessage?.content ? (
                              chat.lastMessage.content.startsWith('{') &&
                              chat.lastMessage.content.includes('"e2ee":true') ? (
                                '🔒 Encrypted message'
                              ) : (
                                chat.lastMessage.content
                              )
                            ) : (
                              <span className="italic text-slate-400 dark:text-zinc-500">No messages yet</span>
                            )}
                          </p>

                          <div className="flex items-center space-x-1 shrink-0">
                            {chat.lastMessage && chat.lastMessage.senderId === user?.id && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#8B95F6]" />
                            )}
                            {chat.unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0066FF] dark:bg-[#E2F952] text-white dark:text-black shrink-0 shadow-xs">
                                {chat.unreadCount}
                              </span>
                            )}
                            {/* Pin / Unpin quick toggle on card */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinChat(chat.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2C2E3C] text-slate-400 dark:text-zinc-400 hover:text-[#0066FF] dark:hover:text-[#E2F952] transition cursor-pointer"
                              title={isPinned ? 'Unpin chat' : 'Pin chat'}
                            >
                              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current text-[#0066FF] dark:text-[#E2F952]' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

        {/* RIGHT PANEL: Active Conversation View (Floated dark card on desktop) */}
        <section
          role="region"
          aria-label="Active conversation"
          className={`flex-1 flex flex-col md:rounded-3xl border border-slate-200/80 dark:border-[#242630] bg-white dark:bg-[#18191E] overflow-hidden shadow-sm md:shadow-xl ${
            activeChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeChat ? (
            <>
              {/* Active Chat Header */}
              <div className="h-14 sm:h-16 border-b border-slate-200/80 dark:border-[#242630] bg-white/95 dark:bg-[#18191E]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  {/* Mobile Back Button to conversation list */}
                  <button
                    type="button"
                    onClick={() => void handleSelectChat(null)}
                    className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161622] transition touch-target-44 flex items-center justify-center shrink-0 cursor-pointer"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </button>

                  <div className="relative shrink-0">
                    {activeChat.type === 'channel' ? (
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                        <Hash className="w-5 h-5" />
                      </div>
                    ) : activeChat.type === 'group' ? (
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : activeChat.avatarUrl ? (
                      <img
                        src={activeChat.avatarUrl}
                        alt={activeChat.name || ''}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-[#222232]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                        {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    {activeChat.type === 'direct' &&
                      activeChat.otherUser &&
                      onlineUsers[activeChat.otherUser.id]?.status === 'online' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0D0D14]" />
                      )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      {activeChat.type === 'channel' && (
                        <span className="font-bold text-blue-500 text-sm">#</span>
                      )}
                      <h2 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {activeChat.name}
                      </h2>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate flex items-center space-x-1.5">
                      {activeTyping.length > 0 ? (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
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
                          <span className="text-slate-400 dark:text-zinc-400">Encrypted workspace</span>
                        </>
                      ) : (
                        <span>Direct Chat</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Shady & Circular Action Buttons in Header matching Image 1 */}
                <WarmTooltipGroup delay={200} warmWindow={300} travel={220}>
                  <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                    <WarmTooltip content="Search in conversation" shortcut="⌘F" side="bottom">
                      <button
                        type="button"
                        onClick={() => toggleInChatSearch()}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
                          inChatSearchOpen
                            ? 'bg-blue-100 dark:bg-[#2F3140] text-blue-600 dark:text-[#8B95F6]'
                            : 'bg-slate-100 dark:bg-[#242630] hover:bg-slate-200 dark:hover:bg-[#2F3140] text-slate-600 dark:text-zinc-300'
                        }`}
                        aria-label="Search in conversation"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </WarmTooltip>

                    {/* Circular Voice Call Button matching Image 1 */}
                    <WarmTooltip content="Voice Call" side="bottom">
                      <button
                        type="button"
                        onClick={handleVoiceCall}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-[#242630] hover:bg-slate-200 dark:hover:bg-[#2F3140] text-[#0066FF] dark:text-[#E2F952] flex items-center justify-center transition shadow-xs cursor-pointer"
                        aria-label="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </WarmTooltip>

                    {/* Circular Video Call Button matching Image 1 */}
                    <WarmTooltip content="Video Call" side="bottom">
                      <button
                        type="button"
                        onClick={handleVideoCall}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-[#242630] hover:bg-slate-200 dark:hover:bg-[#2F3140] text-slate-700 dark:text-zinc-200 hover:text-black dark:hover:text-white flex items-center justify-center transition shadow-xs cursor-pointer"
                        aria-label="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </WarmTooltip>

                    {/* Circular Pin Chat Button matching Image 1 */}
                    <WarmTooltip content={isChatPinned(activeChat.id) ? 'Unpin chat' : 'Pin chat'} side="bottom">
                      <button
                        type="button"
                        onClick={() => togglePinChat(activeChat.id)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
                          isChatPinned(activeChat.id)
                            ? 'bg-blue-50 dark:bg-[#2E313D] text-[#0066FF] dark:text-[#E2F952]'
                            : 'bg-slate-100 dark:bg-[#242630] hover:bg-slate-200 dark:hover:bg-[#2F3140] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                        }`}
                        aria-label="Pin Chat"
                      >
                        <Pin className={`w-4 h-4 ${isChatPinned(activeChat.id) ? 'fill-current' : ''}`} />
                      </button>
                    </WarmTooltip>

                    {/* Circular Members & Details Button matching Image 1 */}
                    <WarmTooltip content="Members & Info" side="bottom">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeChat.type === 'direct' && activeChat.otherUser) {
                            void handleInspectOtherUser(activeChat.otherUser.id);
                          } else {
                            setShowGroupDrawer(!showGroupDrawer);
                          }
                        }}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
                          showGroupDrawer
                            ? 'bg-blue-50 dark:bg-[#2E313D] text-[#0066FF] dark:text-[#8B95F6]'
                            : 'bg-slate-100 dark:bg-[#242630] hover:bg-slate-200 dark:hover:bg-[#2F3140] text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        aria-label="Members & Details"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                    </WarmTooltip>

                    {activeChat.type === 'direct' && activeChat.otherUser && (
                      <WarmTooltip content="Verify Safety Number" side="bottom">
                        <button
                          type="button"
                          onClick={() =>
                            void openSafetyNumberModal(
                              activeChat.otherUser!.id,
                              activeChat.otherUser!.displayName || activeChat.otherUser!.username,
                            )
                          }
                          className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-blue-50 dark:bg-[#20222C] border border-blue-200 dark:border-[#2D2F3C] text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-[#292B38] transition cursor-pointer"
                          aria-label="End-to-End Encrypted (Click to verify safety number)"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#8B95F6]" />
                          <span>E2EE</span>
                        </button>
                      </WarmTooltip>
                    )}
                  </div>
                </WarmTooltipGroup>
              </div>

              {/* In-Chat Search Bar */}
              {inChatSearchOpen && (
                <InChatSearchBar
                  chatId={activeChat.id}
                  onSelectMessage={(msgId) => {
                    const el = document.getElementById(`msg-${msgId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2');
                      setTimeout(() => el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2'), 2500);
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
                  <div className="max-w-2xl mx-auto space-y-4 py-2">
                    {/* Featured Scenery Banner matching Image 1 */}
                    <div className="relative rounded-2xl overflow-hidden border border-[#2B2D3A] shadow-lg max-h-56 bg-[#1C1D24]">
                      <img
                        src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"
                        alt="Workspace banner"
                        className="w-full h-48 sm:h-56 object-cover opacity-90 hover:opacity-100 transition"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#18191E] via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 drop-shadow-md">
                          {activeChat.name || 'ICG Chat'} • General Discussion
                        </span>
                      </div>
                    </div>

                    {/* Date separator badge */}
                    <div className="flex items-center justify-center my-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#22242D] border border-[#2B2C37] text-zinc-400 shadow-xs">
                        Today
                      </span>
                    </div>

                    {/* System message notice */}
                    <div className="text-center text-xs text-zinc-400 py-1 flex items-center justify-center space-x-1.5">
                      <span>&rarr;</span>
                      <span className="font-semibold text-zinc-300">{activeChat.name || 'Host'}</span>
                      <span>initialized this encrypted conversation</span>
                    </div>

                    {/* Call Invite Banner matching Image 1 */}
                    <div className="mx-auto my-3 w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#1C1D24] border border-[#2B2D3A] shadow-md">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#242632] flex items-center justify-center text-[#E2F952] shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-zinc-300 truncate">
                          <span className="font-semibold text-zinc-100">{activeChat.name || 'Richard Wilson'}</span> started a video call
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleVideoCall}
                        className="px-4 py-1.5 rounded-full bg-[#E2F952] hover:bg-[#d6ee3c] text-black text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ml-2"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ) : (
                  currentMessages.map((msg, index) => {
                    const isMe = msg.senderId === user?.id;
                    const prevMsg = index > 0 ? currentMessages[index - 1] : null;
                    const nextMsg = index < currentMessages.length - 1 ? currentMessages[index + 1] : null;
                    const showDateDivider =
                      !prevMsg ||
                      new Date(prevMsg.createdAt).toDateString() !==
                        new Date(msg.createdAt).toDateString();

                    const isLastInSenderSequence =
                      !nextMsg ||
                      nextMsg.senderId !== msg.senderId ||
                      new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000 ||
                      new Date(nextMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                    const isFirstInSenderSequence =
                      !prevMsg ||
                      prevMsg.senderId !== msg.senderId ||
                      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000 ||
                      new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

                    const attachments = msg.attachments || [];

                    return (
                      <div
                        key={msg.id}
                        className={showDateDivider ? 'mt-4 mb-2' : isFirstInSenderSequence ? 'mt-3 sm:mt-4' : 'mt-1.5'}
                      >
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-4">
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#22242D] border border-[#2B2C37] text-zinc-400 shadow-2xs">
                              {formatDateHeader(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <Message align={isMe ? 'end' : 'start'} className="transition-all">
                          <MessageAvatar>
                            {isLastInSenderSequence ? (
                              <div className="relative">
                                <Avatar size="md">
                                  <AvatarImage
                                    src={isMe ? user?.avatarUrl || undefined : msg.sender.avatarUrl || undefined}
                                    alt={isMe ? user?.displayName || 'Me' : msg.sender.displayName || 'User'}
                                  />
                                  <AvatarFallback>
                                    {isMe
                                      ? (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U')
                                      : (msg.sender.displayName ? msg.sender.displayName.charAt(0).toUpperCase() : 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                {onlineUsers[msg.sender.id]?.status === 'online' && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#E2F952] border-2 border-[#18191E]" />
                                )}
                              </div>
                            ) : (
                              <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
                            )}
                          </MessageAvatar>

                          <MessageContent>
                            <div id={`msg-${msg.id}`} className="relative group w-full">
                              {/* Hover Quick Reaction Bar */}
                              <div
                                className={`absolute -top-3.5 ${
                                  isMe ? 'right-2' : 'left-2'
                                } hidden group-hover:flex items-center space-x-1 bg-white dark:bg-zinc-800 shadow-md border border-slate-200 dark:border-zinc-700 rounded-full px-2 py-0.5 z-10 transition`}
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
                                <div className="w-px h-3 bg-slate-200 dark:bg-zinc-700 mx-0.5" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    messageInputRef.current?.focus();
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
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

                              {/* Message Bubble */}
                              <Bubble variant={isMe ? 'default' : 'muted'} className="w-fit max-w-full">
                                {!isMe && isFirstInSenderSequence && activeChat?.type !== 'direct' && (
                                  <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                    {msg.sender.displayName}
                                  </p>
                                )}

                                {/* Quoted Reply Preview */}
                                {msg.replyTo && (
                                  <div
                                    className={`mb-2 p-2 rounded-xl border-l-2 text-xs ${
                                      isMe
                                        ? 'bg-blue-700/60 border-white/60 text-blue-100'
                                        : 'bg-black/5 dark:bg-black/30 border-blue-500 text-slate-700 dark:text-zinc-200'
                                    }`}
                                  >
                                    <p className="font-semibold text-[11px] text-blue-200 dark:text-blue-400">
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
                                              ? 'bg-blue-700/60 border-blue-400/40 text-white'
                                              : 'bg-white/60 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-700/60 text-slate-900 dark:text-zinc-100'
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
                                                : 'hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300'
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
                                  <BubbleContent>
                                    <DecryptedText
                                      content={msg.content}
                                      senderId={msg.senderId || ''}
                                      isMe={isMe}
                                    />
                                  </BubbleContent>
                                )}

                                <div
                                  className={`flex items-center justify-end space-x-1 mt-1 text-[10px] select-none ${
                                    isMe ? 'text-blue-100/80' : 'text-slate-400 dark:text-zinc-400'
                                  }`}
                                >
                                  {msg.isEdited && (
                                    <span className="opacity-75 italic text-[9px] mr-1">(edited)</span>
                                  )}
                                  <span>{formatMessageTime(msg.createdAt)}</span>
                                  {isMe && (
                                    <span title={msg.status || 'sent'} className="inline-flex items-center">
                                      {msg.status === 'read' ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                                      ) : msg.status === 'delivered' ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-blue-200/90" />
                                      ) : msg.status === 'sending' ? (
                                        <Clock className="w-3 h-3 text-blue-200 animate-spin" />
                                      ) : msg.status === 'failed' ? (
                                        <span className="flex items-center text-rose-200 text-[10px] space-x-0.5">
                                          <AlertTriangle className="w-3 h-3 text-rose-200" />
                                          <span>Failed</span>
                                        </span>
                                      ) : (
                                        <Check className="w-3.5 h-3.5 text-blue-200/70" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </Bubble>

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
                                          ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                                      }`}
                                    >
                                      <span>{rx.emoji}</span>
                                      <span className="text-[11px] font-medium">{rx.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </MessageContent>
                        </Message>
                      </div>
                    );
                  })
                )}
                {/* Real-time Typing Bubble */}
                {activeTyping.length > 0 && (
                  <Message align="start" className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <MessageAvatar>
                      <Avatar size="sm">
                        <AvatarFallback className="text-[10px]">
                          {activeTyping[0].charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <Bubble variant="muted" className="py-2 px-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-400 animate-bounce" />
                          <span className="ml-1 text-[11px] text-slate-500 dark:text-zinc-400">
                            {activeTyping.length === 1
                              ? `${activeTyping[0]} is typing...`
                              : `${activeTyping.slice(0, 2).join(', ')} are typing...`}
                          </span>
                        </div>
                      </Bubble>
                    </MessageContent>
                  </Message>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-[#1E1E2A] bg-white/95 dark:bg-[#0D0D14]/95 backdrop-blur-md shrink-0 relative">
                {/* Replying banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center space-x-2 truncate">
                      <Reply className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-blue-700 dark:text-blue-300">
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
                    className="absolute bottom-18 left-2 sm:left-4 z-30 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white/95 dark:bg-[#12121A]/95 border border-slate-200 dark:border-[#222232] rounded-2xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-[#222232]">
                      <div className="flex space-x-1">
                        {(['smileys', 'gestures', 'hearts', 'objects'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEmojiCategory(cat)}
                            className={`px-2 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                              emojiCategory === cat
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1E1E2C]'
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
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E1E2C] hover:scale-120 transition cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staged Attachment Preview */}
                {stagedFile && (
                  <div className="mb-2 p-2 px-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-between animate-in fade-in duration-150">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {stagedPreviewUrl ? (
                        <img
                          src={stagedPreviewUrl}
                          alt="preview"
                          className="w-9 h-9 rounded-lg object-cover border border-blue-300"
                        />
                      ) : stagedFile.type.startsWith('video/') ? (
                        <Film className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : stagedFile.type.startsWith('audio/') ? (
                        <Music className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
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
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/40 cursor-pointer"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end space-x-1.5 sm:space-x-2">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                  />

                  {/* Mobile Collapsed Action Menu (< sm) */}
                  <div className="relative sm:hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowMobileActionsMenu(!showMobileActionsMenu)}
                      disabled={isSending || isUploadingMedia}
                      className={`p-2.5 rounded-xl transition touch-target-44 flex items-center justify-center shrink-0 cursor-pointer ${
                        showMobileActionsMenu
                          ? 'bg-[#0066FF] text-white rotate-45'
                          : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#1E1E2C]'
                      }`}
                      title="More actions"
                      aria-label="Add attachment or emoji"
                    >
                      <Plus className="w-5 h-5 transition-transform" />
                    </button>

                    {showMobileActionsMenu && (
                      <div className="absolute bottom-12 left-0 z-30 bg-white dark:bg-[#12121A] border border-slate-200 dark:border-[#222232] rounded-2xl shadow-xl p-1.5 flex flex-col space-y-1 min-w-[170px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMobileActionsMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E1E2C] transition cursor-pointer"
                        >
                          <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>Attach Media / File</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMobileActionsMenu(false);
                            setShowEmojiPicker(true);
                          }}
                          className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E1E2C] transition cursor-pointer"
                        >
                          <Smile className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>Insert Emoji</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Desktop & Tablet attachment/emoji buttons (sm:flex) */}
                  <div className="hidden sm:flex items-center space-x-1 shrink-0">
                    <WarmTooltip content="Attach File or Media" side="top">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || isUploadingMedia}
                        className="p-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition shrink-0 cursor-pointer"
                        aria-label="Attach file or photo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </WarmTooltip>
                    <WarmTooltip content="Insert Emoji" side="top">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={isSending || isUploadingMedia}
                        className={`p-2.5 rounded-xl transition shrink-0 cursor-pointer ${
                          showEmojiPicker
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                            : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                        aria-label="Insert emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                    </WarmTooltip>
                  </div>

                  {/* Auto-growing message textarea */}
                  <textarea
                    ref={messageInputRef}
                    rows={1}
                    value={messageInput}
                    onChange={(e) => {
                      handleInputChange(e);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage(e);
                      } else if (e.key === 'Escape') {
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
                        ? 'Editing message... (Enter to save, Esc to cancel)'
                        : activeChat.type === 'channel'
                        ? `Write a message in #${activeChat.name}...`
                        : 'Write a message...'
                    }
                    className="flex-1 px-3 sm:px-4 py-2.5 bg-slate-100 dark:bg-[#14151B] border border-slate-200 dark:border-[#262833] rounded-2xl text-base sm:text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B95F6] transition resize-none max-h-32 overflow-y-auto leading-relaxed"
                    style={{ minHeight: '44px' }}
                  />

                  <WarmTooltip content="Send Message" shortcut="↵" side="top">
                    <button
                      type="submit"
                      disabled={(!messageInput.trim() && !stagedFile) || isSending || isUploadingMedia}
                      className="p-2.5 rounded-full bg-[#0066FF] hover:bg-blue-600 dark:bg-[#E2F952] dark:hover:bg-[#d6ee3c] disabled:opacity-40 text-white dark:text-black shadow-md shadow-blue-500/25 transition touch-target-44 flex items-center justify-center shrink-0 self-end cursor-pointer"
                      aria-label="Send Message"
                    >
                      {isUploadingMedia ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                      ) : (
                        <Send className="w-4 h-4 text-white dark:text-black" />
                      )}
                    </button>
                  </WarmTooltip>
                </form>
              </div>
            </>
          ) : (
            /* Empty State occupying the complete space with the wireframe contour globe animation from Image 4 */
            <div className="hidden md:flex flex-1 flex-col items-center justify-center relative overflow-hidden bg-slate-900/5 dark:bg-[#121316] md:rounded-3xl border border-slate-200/80 dark:border-[#242630]">
              <WireframeGlobeAnimation />
            </div>
          )}
        </section>

        {/* RIGHT PANEL (Image 1 Style): Members & Files Media Cards on desktop */}
        {activeChat && (
          <aside className="hidden xl:flex flex-col w-72 2xl:w-80 gap-3 shrink-0 overflow-y-auto">
            {/* Card 1: Members */}
            <div className="rounded-3xl bg-white dark:bg-[#18191E] border border-slate-200/80 dark:border-[#242630] p-4.5 shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  Members
                </h3>
                {activeChat.type !== 'direct' && (
                  <span className="text-xs text-slate-400 dark:text-zinc-400 font-medium">
                    {activeGroupDetails?.membersCount || 1}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {activeChat.type !== 'direct' && activeGroupDetails?.members ? (
                  activeGroupDetails.members.map((m) => {
                    const isMemberOnline = onlineUsers[m.id]?.status === 'online';
                    const isMe = m.id === user?.id;
                    return (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar className="w-10 h-10 rounded-full">
                              <AvatarImage src={m.avatarUrl || ''} />
                              <AvatarFallback className="bg-slate-200 dark:bg-[#242630] text-slate-700 dark:text-zinc-200 text-xs font-bold">
                                {m.displayName?.charAt(0) || m.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {isMemberOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#E2F952] border-2 border-white dark:border-[#18191E]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                              {isMe ? 'You' : m.displayName || m.username}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">@{m.username}</p>
                          </div>
                        </div>
                        {m.role === 'admin' ? (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Admin</span>
                        ) : isMe ? (
                          <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">You</span>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <>
                    {activeChat.otherUser && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar className="w-10 h-10 rounded-full">
                              <AvatarImage src={activeChat.otherUser.avatarUrl || ''} />
                              <AvatarFallback className="bg-slate-200 dark:bg-[#242630] text-slate-700 dark:text-zinc-200 text-xs font-bold">
                                {activeChat.otherUser.displayName?.charAt(0) || activeChat.otherUser.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {onlineUsers[activeChat.otherUser.id]?.status === 'online' && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#E2F952] border-2 border-white dark:border-[#18191E]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                              {activeChat.otherUser.displayName || activeChat.otherUser.username}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">@{activeChat.otherUser.username}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {user && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar className="w-10 h-10 rounded-full">
                              <AvatarImage src={user.avatarUrl || ''} />
                              <AvatarFallback className="bg-slate-200 dark:bg-[#242630] text-slate-700 dark:text-zinc-200 text-xs font-bold">
                                {user.displayName?.charAt(0) || user.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#E2F952] border-2 border-white dark:border-[#18191E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                              {user.displayName || user.username}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">@{user.username}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">You</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Card 2: Files Accordion (Matching Image 1) */}
            <div className="rounded-3xl bg-white dark:bg-[#18191E] border border-slate-200/80 dark:border-[#242630] p-4.5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Files
              </h3>

              {/* Photos & Media Section */}
              <div className="border-b border-slate-100 dark:border-[#242630] pb-3">
                <button
                  type="button"
                  onClick={() => setPhotosExpanded(!photosExpanded)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition py-1 cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <ImageIcon className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                    <span>{photoAttachments.length > 0 ? `${photoAttachments.length} photos` : 'Photos & Media'}</span>
                  </div>
                  {photosExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                </button>

                {photosExpanded && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {photoAttachments.slice(0, 4).map((att, i) => (
                      <img
                        key={i}
                        src={att.storageKey ? resolveApiUrl(att.storageKey) : ''}
                        alt={att.fileName}
                        className="w-full h-20 object-cover rounded-xl border border-slate-200 dark:border-[#2B2C38]"
                      />
                    ))}
                    {photoAttachments.length === 0 && (
                      <div className="col-span-2 py-4 px-3 text-center rounded-xl bg-slate-50 dark:bg-[#14151B] border border-slate-200/60 dark:border-[#242630] text-[11px] text-slate-400 dark:text-zinc-500">
                        No photos shared yet
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Documents & Files Section */}
              <div className="border-b border-slate-100 dark:border-[#242630] pb-3">
                <button
                  type="button"
                  onClick={() => setFilesExpanded(!filesExpanded)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition py-1 cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                    <span>{fileAttachments.length > 0 ? `${fileAttachments.length} files` : 'Files & Docs'}</span>
                  </div>
                  {filesExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                </button>

                {filesExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {fileAttachments.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center space-x-2 p-1.5 rounded-lg bg-slate-50 dark:bg-[#14151B] text-[11px] text-slate-700 dark:text-zinc-300 truncate">
                        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
                        <span className="truncate">{f.fileName}</span>
                      </div>
                    ))}
                    {fileAttachments.length === 0 && (
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic py-1">No documents shared yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Shared Links Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setLinksExpanded(!linksExpanded)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition py-1 cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <LinkIcon className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                    <span>{linkMatches.length > 0 ? `${linkMatches.length} shared links` : 'Shared links'}</span>
                  </div>
                  {linksExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                </button>

                {linksExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {linkMatches.slice(0, 3).map((l, i) => (
                      <a
                        key={i}
                        href={l}
                        target="_blank"
                        rel="noreferrer"
                        className="block p-1.5 rounded-lg bg-slate-50 dark:bg-[#14151B] text-[11px] text-[#0066FF] dark:text-[#8B95F6] hover:underline truncate"
                      >
                        {l}
                      </a>
                    ))}
                    {linkMatches.length === 0 && (
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic py-1">No links shared yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Group Details Right Drawer */}
        <GroupDetailsDrawer
          isOpen={
            showGroupDrawer &&
            Boolean(activeChat && (activeChat.type === 'group' || activeChat.type === 'channel'))
          }
          onClose={() => setShowGroupDrawer(false)}
        />
      </div>

      {/* Mobile Floating Action Button (New Chat/Group) */}
      {!activeChat && (
        <button
          type="button"
          onClick={() => setShowCreateGroupModal(true)}
          className="md:hidden fixed right-4 bottom-6 z-20 w-13 h-13 rounded-full bg-[#0066FF] hover:bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center touch-target-44 hover:scale-105 active:scale-95 transition"
          aria-label="New Conversation or Group"
          title="New Conversation or Group"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

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
