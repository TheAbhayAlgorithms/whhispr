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
import { GroupDetailsDrawer } from '../components/GroupDetailsDrawer';
import { UserSearchModal } from '../components/UserSearchModal';
import { ContactRequestsModal } from '../components/ContactRequestsModal';
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
import {
  MessageSquare,
  LogOut,
  User as UserIcon,
  Users,
  Bell,
  Search,
  Check,
  CheckCheck,
  Smile,
  Hash,
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
  Sparkles,
  ArrowUp,
  UserPlus,
  Info,
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
    getOrCreateDirectChat,
  } = useChatStore();

  const {
    contacts,
    incomingRequests,
    fetchContacts,
    fetchRequests,
    sendContactRequest,
  } = useContactStore();
  const { onlineUsers } = useSocketStore();
  const { fetchUserProfile, viewingProfile, clearViewingProfile } = useProfileStore();

  const [messageInput, setMessageInput] = useState('');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileActionsMenu, setShowMobileActionsMenu] = useState(false);

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

  // Search & Contacts Modal State
  const { inChatSearchOpen, toggleInChatSearch } = useSearchStore();
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [showContactRequestsModal, setShowContactRequestsModal] = useState(false);

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
        setShowUserSearchModal((prev) => !prev);
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
    void fetchContacts();
    void fetchRequests();
    const cleanup = setupSocketListeners();
    return cleanup;
  }, [fetchChats, fetchContacts, fetchRequests, setupSocketListeners]);

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
        setShowUserSearchModal(false);
        setShowContactRequestsModal(false);
        setShowCreateGroupModal(false);
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


  const isDirectChatContact =
    activeChat?.type === 'direct' && activeChat.otherUser
      ? contacts.some((c) => c.userId === activeChat.otherUser?.id)
      : true;

  const handleVoiceCall = () => {
    if (!activeChat) return;
    if (activeChat.type === 'direct' && activeChat.otherUser) {
      if (!isDirectChatContact) {
        setBannerNotice('You must send a contact request and be accepted by this user before calling.');
        setTimeout(() => setBannerNotice(null), 4000);
        void handleInspectOtherUser(activeChat.otherUser.id);
        return;
      }
      void startCall({
        recipientId: activeChat.otherUser.id,
        recipientName: activeChat.otherUser.displayName || activeChat.otherUser.username,
        recipientAvatar: activeChat.otherUser.avatarUrl,
        chatId: activeChat.id,
        callType: 'audio',
      });
    } else if (activeGroupDetails?.members && activeGroupDetails.members.length > 0) {
      const target = activeGroupDetails.members.find((m) => m.userId !== user?.id) || activeGroupDetails.members[0];
      if (target) {
        void startCall({
          recipientId: target.userId,
          recipientName: target.displayName || target.username,
          recipientAvatar: target.avatarUrl,
          chatId: activeChat.id,
          callType: 'audio',
        });
      }
    }
  };

  const handleVideoCall = () => {
    if (!activeChat) return;
    if (activeChat.type === 'direct' && activeChat.otherUser) {
      if (!isDirectChatContact) {
        setBannerNotice('You must send a contact request and be accepted by this user before calling.');
        setTimeout(() => setBannerNotice(null), 4000);
        void handleInspectOtherUser(activeChat.otherUser.id);
        return;
      }
      void startCall({
        recipientId: activeChat.otherUser.id,
        recipientName: activeChat.otherUser.displayName || activeChat.otherUser.username,
        recipientAvatar: activeChat.otherUser.avatarUrl,
        chatId: activeChat.id,
        callType: 'video',
      });
    } else if (activeGroupDetails?.members && activeGroupDetails.members.length > 0) {
      const target = activeGroupDetails.members.find((m) => m.userId !== user?.id) || activeGroupDetails.members[0];
      if (target) {
        void startCall({
          recipientId: target.userId,
          recipientName: target.displayName || target.username,
          recipientAvatar: target.avatarUrl,
          chatId: activeChat.id,
          callType: 'video',
        });
      }
    }
  };

  return (
    <div className="h-screen h-dvh bg-[#191A1A] text-[#EDEDED] flex flex-col overflow-hidden transition-colors duration-200">
      {/* Top Navbar Only */}
      <WarmTooltipGroup delay={200} warmWindow={300} travel={220} lean={0}>
        <header className="h-14 sm:h-16 w-full border-b border-[#2C2E2E] bg-[#141515] px-3 sm:px-5 lg:px-6 flex items-center justify-between shrink-0 z-30 select-none shadow-xs">
          {/* Left: Brand */}
          <div className="flex items-center space-x-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => void handleSelectChat(null)}
              className="flex items-center space-x-2.5 group cursor-pointer focus:outline-none"
              aria-label="Whhispr Home"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#20B2AA] flex items-center justify-center text-black shadow-md shadow-[#20B2AA]/20 group-hover:scale-105 active:scale-95 transition shrink-0 font-bold">
                <MessageSquare className="w-5 h-5 fill-current text-black" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-base font-bold tracking-tight text-[#EDEDED] leading-tight">
                  Whhispr
                </span>
                <span className="text-[10px] font-medium text-[#9EA3A3] hidden sm:inline">
                  Secure Messaging
                </span>
              </div>
            </button>
          </div>

          {/* Right: Tools, Theme Toggle, Profile, Sign Out */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* User Search Trigger (Directly and only searches users by username) */}
            <WarmTooltip content="Search users by @username" shortcut="⌘K" side="bottom">
              <button
                type="button"
                onClick={() => setShowUserSearchModal(true)}
                className="w-9 h-9 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] flex items-center justify-center transition cursor-pointer active:scale-95"
                aria-label="Search users by username"
              >
                <Search className="w-4 h-4" />
              </button>
            </WarmTooltip>

            {/* Direct Contacts Button */}
            <WarmTooltip content="Contacts" shortcut="⌘2" side="bottom">
              <Link
                to="/contacts"
                className="relative w-9 h-9 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] flex items-center justify-center transition cursor-pointer active:scale-95"
                aria-label="Contacts"
              >
                <Users className="w-4 h-4 text-[#20B2AA]" />
              </Link>
            </WarmTooltip>

            {/* Requests Option: Beside contacts, shown ONLY when there is a request, otherwise not displayed */}
            {incomingRequests.length > 0 && (
              <WarmTooltip content={`New Requests (${incomingRequests.length})`} side="bottom">
                <button
                  type="button"
                  onClick={() => setShowContactRequestsModal(true)}
                  className="relative h-9 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-500 flex items-center space-x-1.5 transition cursor-pointer active:scale-95 animate-pulse"
                  aria-label="New Contact Requests"
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-500">
                    {incomingRequests.length}
                  </span>
                </button>
              </WarmTooltip>
            )}

            {/* Notifications Bell */}
            <WarmTooltip content="Notifications" shortcut="⌘4" side="bottom">
              <button
                type="button"
                onClick={() => toggleNotificationCenter()}
                className="relative w-9 h-9 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] flex items-center justify-center transition cursor-pointer active:scale-95"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#20B2AA] text-black rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
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
                  className="w-9 h-9 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] flex items-center justify-center transition active:scale-95"
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
                    className="w-9 h-9 rounded-xl bg-[#1D2B29] hover:bg-[#253B37] border border-[#25423E] text-[#20B2AA] flex items-center justify-center transition active:scale-95"
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
                className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[#20B2AA]/40 hover:border-[#20B2AA] shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                aria-label={`${user?.displayName} (@${user?.username})`}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#20B2AA] text-black font-bold flex items-center justify-center text-xs">
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
                  className="w-9 h-9 rounded-xl bg-[#202222] hover:bg-rose-950/30 border border-[#2D3030] hover:border-rose-900/40 text-[#9EA3A3] hover:text-rose-400 flex items-center justify-center transition active:scale-95 cursor-pointer"
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
              className="md:hidden w-9 h-9 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] transition flex items-center justify-center shrink-0 active:scale-95"
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
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed top-16 right-3 z-50 w-72 max-w-[calc(100vw-24px)] bg-[#141515] border border-[#2C2E2E] rounded-2xl shadow-2xl p-2.5 flex flex-col md:hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 origin-top-right max-h-[calc(100dvh-4.5rem)] overflow-y-auto">
                {/* User Profile Card */}
                <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-[#202222] border border-[#2D3030]">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#262828] border-2 border-[#20B2AA]/40 flex items-center justify-center text-xs font-bold text-[#20B2AA] shrink-0">
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
                    <p className="text-xs font-bold text-[#EDEDED] truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-[11px] text-[#9EA3A3] truncate">
                      @{user?.username}
                    </p>
                  </div>
                  {user?.role === 'admin' && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#20B2AA]/15 text-[#20B2AA] border border-[#20B2AA]/30 rounded-md shrink-0">
                      Admin
                    </span>
                  )}
                </div>

                {/* Theme Toggle Row */}
                <div className="mt-2 px-2.5 py-2 rounded-xl bg-[#202222] border border-[#2D3030] flex items-center justify-between">
                  <span className="text-xs font-medium text-[#EDEDED]">Theme</span>
                  <ThemeToggle showLabel={true} />
                </div>

                {/* Menu Links */}
                <div className="mt-2 pt-1.5 border-t border-[#2C2E2E] space-y-0.5">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowCallHistoryModal(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EDEDED] hover:bg-[#202222] transition text-left active:scale-[0.99]"
                  >
                    <PhoneCall className="w-4 h-4 text-[#20B2AA] shrink-0" />
                    <span>Calls</span>
                  </button>

                  <Link
                    to="/contacts"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#EDEDED] hover:bg-[#202222] transition active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Users className="w-4 h-4 text-[#20B2AA] shrink-0" />
                      <span>Contacts</span>
                    </div>
                  </Link>

                  {incomingRequests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowContactRequestsModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition active:scale-[0.99]"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Requests</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                        {incomingRequests.length}
                      </span>
                    </button>
                  )}


                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EDEDED] hover:bg-[#202222] transition active:scale-[0.99]"
                  >
                    <UserIcon className="w-4 h-4 text-[#20B2AA] shrink-0" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EDEDED] hover:bg-[#202222] transition active:scale-[0.99]"
                  >
                    <SettingsIcon className="w-4 h-4 text-[#9EA3A3] shrink-0" />
                    <span>Settings</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#20B2AA] hover:bg-[#1D2B29] transition active:scale-[0.99]"
                    >
                      <Shield className="w-4 h-4 text-[#20B2AA] shrink-0" />
                      <span>Admin Portal</span>
                    </Link>
                  )}
                </div>

                {/* Sign Out Button */}
                <div className="mt-1.5 pt-1.5 border-t border-[#2C2E2E]">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void handleLogout();
                    }}
                    disabled={loggingOut}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition active:scale-[0.99]"
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

      {/* Main Two-Panel Minimal Chat Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden p-2.5 sm:p-3 gap-2.5 sm:gap-3 bg-[#191A1A]">
          {/* LEFT PANEL: Chats Sidebar */}
          <aside
            role="region"
            aria-label="Conversations list"
            className={`w-full md:w-84 lg:w-92 xl:w-96 h-full rounded-2xl border border-[#2C2E2E] bg-[#141515] flex flex-col shrink-0 overflow-hidden shadow-sm ${
              activeChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Sidebar Header & Search */}
            <div className="p-3 sm:p-3.5 border-b border-[#2C2E2E] space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wider text-[#9EA3A3] uppercase">
                  Threads
                </h2>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setShowCallHistoryModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#EDEDED] text-xs font-medium shadow-2xs transition cursor-pointer"
                    title="View Call History"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-[#20B2AA]" />
                    <span>Calls</span>
                  </button>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs transition cursor-pointer active:scale-95"
                    title="Create Group or Channel"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#737878] absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search threads..."
                  aria-label="Search conversations"
                  className="w-full pl-9 pr-10 sm:pr-14 py-2 bg-[#191A1A] border border-[#2C2E2E] rounded-full text-xs text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowUserSearchModal(true)}
                  title="Search Users by @username (⌘K)"
                  aria-label="Search Users"
                  className="hidden sm:inline-flex absolute right-2.5 px-1.5 py-0.5 rounded bg-[#202222] border border-[#2D3030] text-[10px] font-mono font-medium text-[#9EA3A3] hover:text-[#20B2AA] transition"
                >
                  ⌘K
                </button>
              </div>

            </div>

            {/* Chats Scroll List */}
            <div
              className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2"
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
                  const hasUnread = Boolean(chat.unreadCount && chat.unreadCount > 0);

                  return (
                    <div
                      key={chat.id}
                      onClick={() => void handleSelectChat(chat.id)}
                      className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition-all duration-150 cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[#202222] border border-[#20B2AA]/50 shadow-sm ring-1 ring-[#20B2AA]/20'
                          : hasUnread
                          ? 'bg-[#191A1A] hover:bg-[#202222] border-l-4 border-l-[#20B2AA] border-t border-r border-b border-[#20B2AA]/40 shadow-[0_0_12px_rgba(32,178,170,0.18)] ring-1 ring-[#20B2AA]/25 hover:border-[#20B2AA]'
                          : 'bg-[#191A1A] hover:bg-[#202222] border border-[#262828] hover:border-[#2D3030]'
                      }`}
                    >
                      {/* Avatar Icon with Real-Time Online Dot marked directly on profile */}
                      <div className="relative shrink-0">
                        {chat.type === 'channel' ? (
                          <div className="w-11 h-11 rounded-full bg-[#202222] border border-[#2D3030] text-[#20B2AA] flex items-center justify-center font-bold text-sm shadow-xs">
                            <Hash className="w-5 h-5" />
                          </div>
                        ) : chat.type === 'group' ? (
                          <div className="w-11 h-11 rounded-full bg-[#202222] border border-[#2D3030] text-[#20B2AA] flex items-center justify-center font-bold text-sm shadow-xs">
                            <Users className="w-5 h-5" />
                          </div>
                        ) : chat.avatarUrl ? (
                          <img
                            src={chat.avatarUrl}
                            alt={chat.name || 'Chat'}
                            className="w-11 h-11 rounded-full object-cover border border-[#2D3030]"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#202222] border border-[#2D3030] flex items-center justify-center text-[#EDEDED] font-bold text-sm shadow-xs">
                            {chat.name ? chat.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                        )}
                        {/* Real-time Online Dot marked on the profile */}
                        {chat.type === 'direct' && isUserOnline && (
                          <span
                            title="Online"
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#20B2AA] border-2 border-[#191A1A] shadow-xs"
                          />
                        )}
                        {/* Pulsing Unread Notification Dot Badge on Avatar */}
                        {hasUnread && !isSelected && (
                          <span
                            title={`${chat.unreadCount} unread message${chat.unreadCount > 1 ? 's' : ''}`}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#20B2AA] border-2 border-[#191A1A] shadow-[0_0_8px_rgba(32,178,170,0.85)] flex items-center justify-center text-[8px] font-black text-black animate-pulse"
                          >
                            {chat.unreadCount > 9 ? '•' : chat.unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center space-x-1.5 truncate">
                            {chat.type === 'channel' && <Hash className="w-3.5 h-3.5 text-[#20B2AA] shrink-0" />}
                            <h3 className={`text-xs sm:text-sm truncate ${hasUnread ? 'font-bold text-[#EDEDED]' : 'font-medium text-[#EDEDED]'}`}>
                              {chat.name || 'Conversation'}
                            </h3>
                            {hasUnread && !isSelected && (
                              <span
                                className="w-2 h-2 rounded-full bg-[#20B2AA] shadow-[0_0_6px_rgba(32,178,170,0.9)] animate-pulse shrink-0"
                                title="Unread message"
                              />
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                            {isPinned && (
                              <span title="Pinned">
                                <Pin className="w-3.5 h-3.5 text-[#20B2AA] fill-current shrink-0" />
                              </span>
                            )}
                            {chat.lastMessage && (
                              <span className="text-[10px] text-[#737878]">
                                {formatMessageTime(chat.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtitle preview */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#9EA3A3] truncate pr-2">
                            {(typingUsers[chat.id] || []).filter(
                              (name) => name !== user?.username && name !== user?.displayName,
                            ).length > 0 ? (
                              <span className="text-[#20B2AA] font-semibold animate-pulse">
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
                              <span className="italic text-[#737878]">No messages yet</span>
                            )}
                          </p>

                          <div className="flex items-center space-x-1 shrink-0">
                            {chat.lastMessage && chat.lastMessage.senderId === user?.id && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#20B2AA]" />
                            )}
                            {chat.unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#20B2AA] text-black shrink-0 shadow-xs">
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
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#262828] text-[#9EA3A3] hover:text-[#20B2AA] transition cursor-pointer"
                              title={isPinned ? 'Unpin chat' : 'Pin chat'}
                            >
                              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current text-[#20B2AA]' : ''}`} />
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

        {/* RIGHT PANEL: Active Conversation View */}
        <section
          role="region"
          aria-label="Active conversation"
          className={`flex-1 h-full min-w-0 flex flex-col rounded-2xl border border-[#2C2E2E] bg-[#141515] overflow-hidden shadow-sm ${
            activeChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeChat ? (
            <>
              {/* Active Chat Header */}
              <div className="h-14 sm:h-16 border-b border-[#2C2E2E] bg-[#141515] px-3 sm:px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  {/* Mobile Back Button to conversation list */}
                  <button
                    type="button"
                    onClick={() => void handleSelectChat(null)}
                    className="md:hidden p-2 -ml-1 rounded-xl text-[#9EA3A3] hover:bg-[#202222] transition touch-target-44 flex items-center justify-center shrink-0 cursor-pointer"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-5 h-5 text-[#20B2AA]" />
                  </button>

                  <div className="relative shrink-0">
                    {activeChat.type === 'channel' ? (
                      <div className="w-10 h-10 rounded-xl bg-[#202222] border border-[#2D3030] text-[#20B2AA] flex items-center justify-center font-bold shadow-xs">
                        <Hash className="w-5 h-5" />
                      </div>
                    ) : activeChat.type === 'group' ? (
                      <div className="w-10 h-10 rounded-xl bg-[#202222] border border-[#2D3030] text-[#20B2AA] flex items-center justify-center font-bold shadow-xs">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : activeChat.avatarUrl ? (
                      <img
                        src={activeChat.avatarUrl}
                        alt={activeChat.name || ''}
                        className="w-10 h-10 rounded-xl object-cover border border-[#2D3030]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#202222] border border-[#2D3030] flex items-center justify-center text-[#EDEDED] font-bold text-sm shadow-xs">
                        {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    {activeChat.type === 'direct' &&
                      activeChat.otherUser &&
                      onlineUsers[activeChat.otherUser.id]?.status === 'online' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#20B2AA] border-2 border-[#141515]" />
                      )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      {activeChat.type === 'channel' && (
                        <span className="font-bold text-[#20B2AA] text-sm">#</span>
                      )}
                      <h2 className="font-semibold text-sm text-[#EDEDED] truncate">
                        {activeChat.name}
                      </h2>
                    </div>

                    <p className="text-[11px] text-[#9EA3A3] truncate flex items-center space-x-1.5">
                      {activeTyping.length > 0 ? (
                        <span className="text-[#20B2AA] font-semibold animate-pulse">
                          {activeTyping.length === 1
                            ? `${activeTyping[0]} is typing...`
                            : `${activeTyping.slice(0, 2).join(', ')} are typing...`}
                        </span>
                      ) : activeChat.type === 'channel' ? (
                        <>
                          <span className="flex items-center space-x-1">
                            {activeChat.isPublic ? (
                              <Globe className="w-3 h-3 text-[#20B2AA]" />
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
                          <span className="text-[#9EA3A3]">Encrypted workspace</span>
                        </>
                      ) : (
                        <span>Direct Chat</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Shady & Circular Action Buttons in Header matching Perplexity dark style */}
                <WarmTooltipGroup delay={200} warmWindow={300} travel={220}>
                  <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                    <WarmTooltip content="Search in conversation" shortcut="⌘F" side="bottom">
                      <button
                        type="button"
                        onClick={() => toggleInChatSearch()}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
                          inChatSearchOpen
                            ? 'bg-[#1D2B29] text-[#20B2AA] border border-[#25423E]'
                            : 'bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED]'
                        }`}
                        aria-label="Search in conversation"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </WarmTooltip>

                    {/* Circular Voice Call Button */}
                    <WarmTooltip content="Voice Call" side="bottom">
                      <button
                        type="button"
                        onClick={handleVoiceCall}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#20B2AA] hover:text-[#1CA099] flex items-center justify-center transition shadow-xs cursor-pointer"
                        aria-label="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </WarmTooltip>

                    {/* Circular Video Call Button */}
                    <WarmTooltip content="Video Call" side="bottom">
                      <button
                        type="button"
                        onClick={handleVideoCall}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#EDEDED] hover:text-[#20B2AA] flex items-center justify-center transition shadow-xs cursor-pointer"
                        aria-label="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </WarmTooltip>

                    {/* Circular Pin Chat Button */}
                    <WarmTooltip content={isChatPinned(activeChat.id) ? 'Unpin chat' : 'Pin chat'} side="bottom">
                      <button
                        type="button"
                        onClick={() => togglePinChat(activeChat.id)}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
                          isChatPinned(activeChat.id)
                            ? 'bg-[#1D2B29] text-[#20B2AA] border border-[#25423E]'
                            : 'bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED]'
                        }`}
                        aria-label="Pin Chat"
                      >
                        <Pin className={`w-4 h-4 ${isChatPinned(activeChat.id) ? 'fill-current' : ''}`} />
                      </button>
                    </WarmTooltip>

                    {/* Circular Members & Details Button */}
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
                            ? 'bg-[#1D2B29] text-[#20B2AA] border border-[#25423E]'
                            : 'bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED]'
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
                          className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] text-xs font-semibold hover:bg-[#253B37] transition cursor-pointer"
                          aria-label="End-to-End Encrypted (Click to verify safety number)"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#20B2AA]" />
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
                      el.classList.add('ring-4', 'ring-[#20B2AA]', 'ring-offset-2');
                      setTimeout(() => el.classList.remove('ring-4', 'ring-[#20B2AA]', 'ring-offset-2'), 2500);
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
                  <div className="max-w-md mx-auto text-center py-12 px-4 space-y-4 animate-fade-in my-auto">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#202222] border border-[#2D3030] text-[#20B2AA] flex items-center justify-center shadow-xs">
                      <Shield className="w-7 h-7 text-[#20B2AA]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#EDEDED]">
                        End-to-End Encrypted Conversation
                      </h3>
                      <p className="text-xs text-[#9EA3A3] mt-1.5 leading-relaxed max-w-sm mx-auto">
                        Messages with <span className="text-[#EDEDED] font-semibold">{activeChat.name || 'this contact'}</span> are protected with Signal protocol encryption. No one outside of this chat can read them.
                      </p>
                    </div>
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#1D2B29] border border-[#25423E] text-[#20B2AA]">
                      <Lock className="w-3 h-3 text-[#20B2AA]" />
                      <span>Zero-Knowledge Security</span>
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
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#20B2AA] border-2 border-[#141515]" />
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
                                } hidden group-hover:flex items-center space-x-1 bg-white dark:bg-[#202222] shadow-md border border-[#E5E5E3] dark:border-[#2D3030] rounded-full px-2 py-0.5 z-10 transition`}
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
                                <div className="w-px h-3 bg-slate-200 dark:bg-[#2D3030] mx-0.5" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    messageInputRef.current?.focus();
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-[#20B2AA] transition"
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
                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-amber-500 transition"
                                    title="Edit (within 15m)"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDeletingMessage(msg)}
                                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Message Bubble */}
                              <Bubble variant={isMe ? 'default' : 'muted'} className="w-fit max-w-full">
                                {!isMe && isFirstInSenderSequence && activeChat?.type !== 'direct' && (
                                  <p className="text-[11px] font-semibold text-[#20B2AA] mb-1">
                                    {msg.sender.displayName}
                                  </p>
                                )}

                                {/* Quoted Reply Preview */}
                                {msg.replyTo && (
                                  <div
                                    className={`mb-2 p-2 rounded-xl border-l-2 text-xs ${
                                      isMe
                                        ? 'bg-[#1D2B29] border-[#20B2AA] text-[#EDEDED]'
                                        : 'bg-[#202222] border-[#20B2AA] text-[#EDEDED]'
                                    }`}
                                  >
                                    <p className="font-semibold text-[11px] text-[#20B2AA]">
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
                                              ? 'bg-[#1D2B29] border-[#25423E] text-[#20B2AA]'
                                              : 'bg-white/60 dark:bg-[#202222] border-[#E5E5E3] dark:border-[#2D3030] text-[#191A1A] dark:text-[#EDEDED]'
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
                                                ? 'hover:bg-[#20B2AA]/20 text-[#20B2AA]'
                                                : 'hover:bg-[#F3F3F2] dark:hover:bg-[#262828] text-[#737878] dark:text-[#9EA3A3]'
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
                                    isMe ? 'text-[#20B2AA]/90' : 'text-[#737878] dark:text-[#9EA3A3]'
                                  }`}
                                >
                                  {msg.isEdited && (
                                    <span className="opacity-75 italic text-[9px] mr-1">(edited)</span>
                                  )}
                                  <span>{formatMessageTime(msg.createdAt)}</span>
                                  {isMe && (
                                    <span title={msg.status || 'sent'} className="inline-flex items-center">
                                      {msg.status === 'read' ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-[#20B2AA] drop-shadow-xs" />
                                      ) : msg.status === 'delivered' ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-[#20B2AA]/75" />
                                      ) : msg.status === 'sending' ? (
                                        <Clock className="w-3 h-3 text-[#20B2AA] animate-spin" />
                                      ) : msg.status === 'failed' ? (
                                        <span className="flex items-center text-rose-400 text-[10px] space-x-0.5">
                                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                                          <span>Failed</span>
                                        </span>
                                      ) : (
                                        <Check className="w-3.5 h-3.5 text-[#20B2AA]/60" />
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
                                          ? 'bg-[#1D2B29] border-[#25423E] text-[#20B2AA] font-semibold shadow-2xs'
                                          : 'bg-[#202222] border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#262828]'
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
                        <AvatarFallback className="text-[10px] bg-[#202222] text-[#20B2AA]">
                          {activeTyping[0].charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <Bubble variant="muted" className="py-2 px-3.5 bg-[#202222] border-[#2D3030]">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#20B2AA] animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#20B2AA] animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#20B2AA] animate-bounce" />
                          <span className="ml-1 text-[11px] text-[#9EA3A3]">
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
              <div className="p-3 sm:p-4 border-t border-[#2C2E2E] bg-[#141515] shrink-0 relative">
                {/* Replying banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-[#1D2B29] border border-[#25423E] text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center space-x-2 truncate">
                      <Reply className="w-4 h-4 text-[#20B2AA] shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-[#20B2AA]">
                          Replying to {replyingTo.sender.displayName}:
                        </span>{' '}
                        <span className="text-[#EDEDED] truncate">
                          {replyingTo.content || '[Attachment]'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-[#9EA3A3] hover:text-[#EDEDED] rounded-full transition"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Editing banner */}
                {editingMessage && (
                  <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-[#262217] border border-[#3E3520] text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center space-x-2 truncate">
                      <Pencil className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-amber-300">
                          Editing message:
                        </span>{' '}
                        <span className="text-[#EDEDED] truncate">
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
                      className="p-1 text-[#9EA3A3] hover:text-[#EDEDED] rounded-full transition"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-20 left-2 sm:left-4 z-30 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-[#202222] border border-[#2D3030] rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2D3030]">
                      <div className="flex space-x-1">
                        {(['smileys', 'gestures', 'hearts', 'objects'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEmojiCategory(cat)}
                            className={`px-2 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                              emojiCategory === cat
                                ? 'bg-[#1D2B29] text-[#20B2AA] font-semibold'
                                : 'text-[#9EA3A3] hover:bg-[#262828] hover:text-[#EDEDED]'
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
                        className="p-1 rounded-lg text-[#9EA3A3] hover:text-[#EDEDED] transition"
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
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#262828] hover:scale-120 transition cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staged Attachment Preview */}
                {stagedFile && (
                  <div className="mb-2 p-2 px-3 rounded-2xl bg-[#1D2B29] border border-[#25423E] flex items-center justify-between animate-in fade-in duration-150">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {stagedPreviewUrl ? (
                        <img
                          src={stagedPreviewUrl}
                          alt="preview"
                          className="w-9 h-9 rounded-lg object-cover border border-[#20B2AA]/40"
                        />
                      ) : stagedFile.type.startsWith('video/') ? (
                        <Film className="w-5 h-5 text-[#20B2AA] shrink-0" />
                      ) : stagedFile.type.startsWith('audio/') ? (
                        <Music className="w-5 h-5 text-[#20B2AA] shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-[#20B2AA] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#EDEDED] truncate">
                          {stagedFile.name}
                        </p>
                        <p className="text-[10px] text-[#9EA3A3]">
                          {formatFileSize(stagedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearStagedFile}
                      className="p-1 rounded-lg text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-white/10 cursor-pointer"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Perplexity Styled Floating Prompt Bar or Contact Request Gate */}
                {!isDirectChatContact && activeChat.type === 'direct' && activeChat.otherUser ? (
                  <div className="bg-[#202222] border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-in fade-in duration-150">
                    <div className="flex items-center space-x-3 text-left w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#EDEDED]">
                          Contact Request Required
                        </p>
                        <p className="text-[11px] text-[#9EA3A3]">
                          You cannot directly text {activeChat.otherUser.displayName || 'this user'} until you send a contact request and they accept it.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (activeChat.otherUser?.id) {
                          try {
                            const res = await sendContactRequest({ targetUserId: activeChat.otherUser.id });
                            setBannerNotice(res.message || 'Contact request sent! You can text once accepted.');
                            setTimeout(() => setBannerNotice(null), 4000);
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Failed to send contact request';
                            setBannerNotice(msg);
                            setTimeout(() => setBannerNotice(null), 4000);
                          }
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 shrink-0 shadow-md shadow-[#20B2AA]/20 active:scale-95"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Send Contact Request</span>
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendMessage}
                    className="bg-[#202222] border border-[#2D3030] focus-within:border-[#20B2AA] focus-within:ring-1 focus-within:ring-[#20B2AA]/30 rounded-2xl p-2 sm:p-2.5 flex items-end space-x-1.5 sm:space-x-2 transition-all shadow-md"
                  >
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
                        className={`p-2 rounded-xl transition touch-target-44 flex items-center justify-center shrink-0 cursor-pointer ${
                          showMobileActionsMenu
                            ? 'bg-[#20B2AA] text-black rotate-45'
                            : 'text-[#9EA3A3] hover:text-[#20B2AA] hover:bg-[#262828]'
                        }`}
                        title="More actions"
                        aria-label="Add attachment or emoji"
                      >
                        <Plus className="w-4 h-4 transition-transform" />
                      </button>

                      {showMobileActionsMenu && (
                        <div className="absolute bottom-12 left-0 z-30 bg-[#202222] border border-[#2D3030] rounded-2xl shadow-xl p-1.5 flex flex-col space-y-1 min-w-[170px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMobileActionsMenu(false);
                              fileInputRef.current?.click();
                            }}
                            className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EDEDED] hover:bg-[#262828] transition cursor-pointer"
                          >
                            <Paperclip className="w-4 h-4 text-[#20B2AA] shrink-0" />
                            <span>Attach Media / File</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMobileActionsMenu(false);
                              setShowEmojiPicker(true);
                            }}
                            className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EDEDED] hover:bg-[#262828] transition cursor-pointer"
                          >
                            <Smile className="w-4 h-4 text-[#20B2AA] shrink-0" />
                            <span>Insert Emoji</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Desktop & Tablet attachment/emoji buttons (sm:flex) */}
                    <div className="hidden sm:flex items-center space-x-0.5 shrink-0 mb-0.5">
                      <WarmTooltip content="Attach File or Media" side="top">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSending || isUploadingMedia}
                          className="p-2 rounded-xl text-[#9EA3A3] hover:text-[#20B2AA] hover:bg-[#262828] transition shrink-0 cursor-pointer"
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
                          className={`p-2 rounded-xl transition shrink-0 cursor-pointer ${
                            showEmojiPicker
                              ? 'bg-[#1D2B29] text-[#20B2AA]'
                              : 'text-[#9EA3A3] hover:text-[#20B2AA] hover:bg-[#262828]'
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
                          ? `Message in #${activeChat.name}...`
                          : 'Ask anything or write a message...'
                      }
                      className="flex-1 px-2.5 py-1.5 bg-transparent border-none text-base sm:text-sm text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:ring-0 transition resize-none max-h-32 overflow-y-auto leading-relaxed"
                      style={{ minHeight: '38px' }}
                    />

                    <WarmTooltip content="Send Message" shortcut="↵" side="top">
                      <button
                        type="submit"
                        disabled={(!messageInput.trim() && !stagedFile) || isSending || isUploadingMedia}
                        className="w-9 h-9 rounded-full bg-[#20B2AA] hover:bg-[#1CA099] disabled:opacity-30 text-black shadow-md shadow-[#20B2AA]/20 transition touch-target-44 flex items-center justify-center shrink-0 self-end font-bold cursor-pointer active:scale-95 mb-0.5"
                        aria-label="Send Message"
                      >
                        {isUploadingMedia ? (
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                        ) : (
                          <ArrowUp className="w-4 h-4 stroke-[2.5] text-black" />
                        )}
                      </button>
                    </WarmTooltip>
                  </form>
                )}
              </div>
            </>
          ) : (
            /* Iconic Perplexity AI Home Interface */
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-6 lg:p-12 text-center select-none bg-[#141515] overflow-y-auto">
              <div className="max-w-2xl w-full flex flex-col items-center">
                {/* Sparkle badge */}
                <div className="w-12 h-12 rounded-2xl bg-[#202222] border border-[#2D3030] flex items-center justify-center text-[#20B2AA] mb-4 shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>

                {/* Title */}
                <h1 className="text-3xl lg:text-4xl font-normal tracking-tight text-[#EDEDED] mb-2 font-serif sm:font-sans">
                  Where conversation begins
                </h1>
                <p className="text-xs sm:text-sm text-[#9EA3A3] mb-8 max-w-md">
                  Start a new thread, search messages, or start a peer-to-peer encrypted call.
                </p>

                {/* Floating Perplexity Prompt / Starter Box */}
                <div className="w-full bg-[#202222] border border-[#2D3030] hover:border-[#383B3B] focus-within:border-[#20B2AA] rounded-2xl shadow-xl p-4 sm:p-5 text-left mb-6 transition-all">
                  <div className="flex items-start space-x-3 mb-4">
                    <MessageSquare className="w-5 h-5 text-[#20B2AA] shrink-0 mt-0.5" />
                    <input
                      type="text"
                      readOnly
                      onClick={() => setShowCreateGroupModal(true)}
                      placeholder="Message anyone, start a group, or join a channel..."
                      className="w-full bg-transparent text-sm text-[#EDEDED] placeholder-[#737878] focus:outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#2A2C2C]">
                    <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setShowCreateGroupModal(true)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#2A2C2C] hover:bg-[#333636] border border-[#333636] text-[#EDEDED] text-xs font-medium transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#20B2AA]" />
                        <span>New Thread</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/contacts')}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#2A2C2C] hover:bg-[#333636] border border-[#333636] text-[#EDEDED] text-xs font-medium transition cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-[#20B2AA]" />
                        <span>Contacts</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateGroupModal(true)}
                      className="w-8 h-8 rounded-full bg-[#20B2AA] hover:bg-[#1CA099] text-black flex items-center justify-center font-bold shadow-sm transition shrink-0 ml-2 cursor-pointer active:scale-95"
                      aria-label="Start Conversation"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Quick starter cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(true)}
                    className="p-3.5 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] hover:border-[#383B3B] transition text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#2A2C2C] flex items-center justify-center text-[#20B2AA] mb-2.5 group-hover:scale-105 transition">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-[#EDEDED] mb-1">Direct Messages</h4>
                    <p className="text-[11px] text-[#9EA3A3] leading-relaxed">
                      Encrypted peer-to-peer chats with verified keys and typing status.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCallHistoryModal(true)}
                    className="p-3.5 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] hover:border-[#383B3B] transition text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#2A2C2C] flex items-center justify-center text-[#20B2AA] mb-2.5 group-hover:scale-105 transition">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-[#EDEDED] mb-1">Audio & Video</h4>
                    <p className="text-[11px] text-[#9EA3A3] leading-relaxed">
                      Instant crystal-clear WebRTC calls with screen sharing.
                    </p>
                  </button>
                </div>
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

      {/* Mobile Floating Action Button (New Chat/Group) */}
      {!activeChat && (
        <button
          type="button"
          onClick={() => setShowCreateGroupModal(true)}
          className="md:hidden fixed right-4 bottom-6 z-20 w-13 h-13 rounded-full bg-[#20B2AA] hover:bg-[#1CA099] text-black shadow-xl shadow-[#20B2AA]/30 flex items-center justify-center touch-target-44 hover:scale-105 active:scale-95 transition"
          aria-label="New Conversation or Group"
          title="New Conversation or Group"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
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

      {/* Floating Notice / Toast */}
      {bannerNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#202222] border border-[#20B2AA]/50 text-[#EDEDED] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Info className="w-4 h-4 text-[#20B2AA] shrink-0" />
          <span>{bannerNotice}</span>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="p-1 text-[#9EA3A3] hover:text-[#EDEDED] rounded-full transition ml-2 cursor-pointer"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modals */}
      <UserProfileModal
        profile={viewingProfile}
        onClose={clearViewingProfile}
        onStartCall={(params) => void startCall(params)}
        onOpenChat={async (userId) => {
          try {
            const chat = await getOrCreateDirectChat(userId);
            await handleSelectChat(chat.id);
            clearViewingProfile();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Cannot direct message this user without accepted contact';
            setBannerNotice(msg);
            setTimeout(() => setBannerNotice(null), 4000);
          }
        }}
      />
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
      />

      {/* Delete Message Confirmation Modal */}
      {deletingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#141515] border border-[#2C2E2E] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[#EDEDED]">Delete Message</h3>
                <p className="text-xs text-[#9EA3A3]">Choose how to delete this message</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteConfirm('me')}
                className="w-full py-2.5 px-3 rounded-xl border border-[#2D3030] bg-[#202222] text-[#EDEDED] hover:bg-[#262828] font-medium text-xs transition text-left flex items-center justify-between cursor-pointer"
              >
                <span>Delete for me</span>
                <span className="text-[10px] text-[#737878]">Hides on this device</span>
              </button>

              {(deletingMessage.senderId === user?.id ||
                activeGroupDetails?.callerRole === 'owner' ||
                activeGroupDetails?.callerRole === 'admin') && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteConfirm('everyone')}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition text-left flex items-center justify-between shadow-xs cursor-pointer"
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
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* User Search by Username Modal */}
      <UserSearchModal
        isOpen={showUserSearchModal}
        onClose={() => setShowUserSearchModal(false)}
      />

      {/* Incoming Contact Requests Modal */}
      <ContactRequestsModal
        isOpen={showContactRequestsModal}
        onClose={() => setShowContactRequestsModal(false)}
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
