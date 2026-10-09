import { useEffect, useRef } from 'react';
import { useSearchStore } from '../store/useSearchStore';
import { useChatStore } from '../store/useChatStore';
import { useContactStore } from '../store/useContactStore';
import { useProfileStore } from '../store/useProfileStore';
import {
  Search,
  X,
  Hash,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const {
    globalQuery,
    setGlobalQuery,
    searchGlobal,
    isSearching,
    activeTab,
    setActiveTab,
    unifiedResults,
    clearSearch,
  } = useSearchStore();

  const { selectChat, getOrCreateDirectChat } = useChatStore();
  const { contacts } = useContactStore();
  const { fetchUserProfile } = useProfileStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      clearSearch();
    }
  }, [isOpen, clearSearch]);

  const handleQueryChange = (val: string) => {
    setGlobalQuery(val);
    void searchGlobal(val);
  };

  const handleSelectMessage = async (chatId: string) => {
    await selectChat(chatId);
    onClose();
  };

  const handleSelectUser = async (targetUserId: string) => {
    const isContact = contacts.some((c) => c.userId === targetUserId);
    if (isContact) {
      const chat = await getOrCreateDirectChat(targetUserId);
      await selectChat(chat.id);
      onClose();
    } else {
      await fetchUserProfile(targetUserId);
      onClose();
    }
  };

  const handleSelectChannel = async (channelId: string) => {
    await selectChat(channelId);
    onClose();
  };

  if (!isOpen) return null;

  const totalMatches =
    unifiedResults.messages.length +
    unifiedResults.users.length +
    unifiedResults.chats.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#141515] border-b sm:border border-[#2C2E2E] rounded-none sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[80vh] pt-safe pb-safe animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-[#2C2E2E] flex items-center space-x-3 bg-[#141515] shrink-0">
          <Search className="w-5 h-5 text-[#20B2AA] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={globalQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Search messages, people, or channels..."
            className="flex-1 bg-transparent border-none text-base sm:text-sm text-[#EDEDED] placeholder-[#737878] focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#20B2AA] shrink-0" />
          ) : globalQuery ? (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="p-1 text-[#9EA3A3] hover:text-[#EDEDED] rounded-full transition touch-target-44 flex items-center justify-center cursor-pointer"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#202222] text-[#9EA3A3] border border-[#2D3030]">
              ESC
            </kbd>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9EA3A3] hover:text-[#EDEDED] rounded-xl hover:bg-[#202222] transition touch-target-44 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Tabs */}
        {globalQuery.trim() && (
          <div className="flex items-center space-x-2 px-4 py-2 border-b border-[#2C2E2E] text-xs bg-[#141515] overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'all'
                  ? 'bg-[#1D2B29] border border-[#25423E] text-[#20B2AA]'
                  : 'text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222]'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-75 font-semibold">({totalMatches})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'messages'
                  ? 'bg-[#1D2B29] border border-[#25423E] text-[#20B2AA]'
                  : 'text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222]'
              }`}
            >
              <span>Messages</span>
              <span className="text-[10px] opacity-75 font-semibold">
                ({unifiedResults.messages.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'users'
                  ? 'bg-[#1D2B29] border border-[#25423E] text-[#20B2AA]'
                  : 'text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222]'
              }`}
            >
              <span>People</span>
              <span className="text-[10px] opacity-75 font-semibold">
                ({unifiedResults.users.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chats')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'chats'
                  ? 'bg-[#1D2B29] border border-[#25423E] text-[#20B2AA]'
                  : 'text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222]'
              }`}
            >
              <span>Channels & Groups</span>
              <span className="text-[10px] opacity-75 font-semibold">
                ({unifiedResults.chats.length})
              </span>
            </button>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141515]">
          {!globalQuery.trim() ? (
            <div className="py-12 text-center text-[#9EA3A3] space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-[#20B2AA] opacity-80" />
              <p className="text-sm font-medium text-[#EDEDED]">Type to search messages, people, or channels</p>
              <p className="text-xs text-[#737878]">Search is instant, scoped to your permissions, and full-text indexed</p>
            </div>
          ) : totalMatches === 0 && !isSearching ? (
            <div className="py-12 text-center text-[#9EA3A3] space-y-2">
              <Search className="w-8 h-8 mx-auto text-[#737878]" />
              <p className="text-sm font-medium text-[#EDEDED]">No results found for &ldquo;{globalQuery}&rdquo;</p>
              <p className="text-xs text-[#737878]">Try checking spelling or using different keywords</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Messages Section */}
              {(activeTab === 'all' || activeTab === 'messages') &&
                unifiedResults.messages.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#737878] px-2 flex items-center justify-between">
                      <span>Messages</span>
                      <span>{unifiedResults.messages.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {unifiedResults.messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => void handleSelectMessage(msg.chatId)}
                          className="p-3 rounded-xl bg-[#202222] border border-[#2D3030] hover:border-[#20B2AA]/50 hover:bg-[#262828] transition cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span className="font-semibold text-[#EDEDED] flex items-center space-x-1.5">
                              <span>{msg.chatName || 'Direct Message'}</span>
                              <span className="text-[10px] text-[#737878]">
                                • {msg.senderDisplayName}
                              </span>
                            </span>
                            <span className="text-[10px] text-[#737878] flex items-center space-x-1">
                              <Calendar className="w-3 h-3 opacity-60" />
                              <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                          <p
                            className="text-xs text-[#9EA3A3] leading-relaxed line-clamp-2 [&>mark]:bg-[#20B2AA]/20 [&>mark]:text-[#20B2AA] [&>mark]:px-1 [&>mark]:rounded-sm"
                            dangerouslySetInnerHTML={{ __html: msg.headline }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* People Section */}
              {(activeTab === 'all' || activeTab === 'users') &&
                unifiedResults.users.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#737878] px-2 flex items-center justify-between">
                      <span>People</span>
                      <span>{unifiedResults.users.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {unifiedResults.users.map((u) => {
                        const isContact = contacts.some((c) => c.userId === u.userId);
                        return (
                          <div
                            key={u.userId}
                            onClick={() => void handleSelectUser(u.userId)}
                            className="p-2.5 rounded-xl bg-[#202222] border border-[#2D3030] hover:border-[#20B2AA]/50 hover:bg-[#262828] transition cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] flex items-center justify-center font-bold text-xs">
                                {u.avatarUrl ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.displayName}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  u.displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-[#EDEDED]">
                                  {u.displayName}
                                </p>
                                <p className="text-[11px] text-[#737878]">@{u.username}</p>
                              </div>
                            </div>
                            {isContact ? (
                              <span className="text-[11px] font-semibold text-[#20B2AA] hover:text-[#1CA099]">
                                Message
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-400 hover:text-amber-300">
                                View / Add
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Channels & Groups Section */}
              {(activeTab === 'all' || activeTab === 'chats') &&
                unifiedResults.chats.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#737878] px-2 flex items-center justify-between">
                      <span>Channels & Groups</span>
                      <span>{unifiedResults.chats.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {unifiedResults.chats.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => void handleSelectChannel(c.id)}
                          className="p-2.5 rounded-xl bg-[#202222] border border-[#2D3030] hover:border-[#20B2AA]/50 hover:bg-[#262828] transition cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] flex items-center justify-center font-bold text-xs shrink-0">
                              <Hash className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#EDEDED] truncate">
                                {c.name}
                              </p>
                              {c.description && (
                                <p className="text-[11px] text-[#737878] truncate">
                                  {c.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#191A1A] border border-[#2D3030] text-[#9EA3A3] shrink-0">
                            {c.memberCount} members
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
