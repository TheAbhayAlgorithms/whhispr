import { useEffect, useRef } from 'react';
import { useSearchStore } from '../store/useSearchStore';
import { useChatStore } from '../store/useChatStore';
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
    const chat = await getOrCreateDirectChat(targetUserId);
    await selectChat(chat.id);
    onClose();
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/50 dark:bg-slate-950/40">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={globalQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Search messages, people, or channels..."
            className="flex-1 bg-transparent border-none text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400 shrink-0" />
          ) : globalQuery ? (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
              ESC
            </kbd>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Tabs */}
        {globalQuery.trim() && (
          <div className="flex items-center space-x-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] opacity-75 font-semibold">({totalMatches})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'messages'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
              className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'chats'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!globalQuery.trim() ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-400 opacity-60" />
              <p className="text-sm font-medium">Type to search messages, people, or channels</p>
              <p className="text-xs text-slate-400">Search is instant, scoped to your permissions, and full-text indexed</p>
            </div>
          ) : totalMatches === 0 && !isSearching ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">No results found for &ldquo;{globalQuery}&rdquo;</p>
              <p className="text-xs text-slate-400">Try checking spelling or using different keywords</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Messages Section */}
              {(activeTab === 'all' || activeTab === 'messages') &&
                unifiedResults.messages.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                      <span>Messages</span>
                      <span>{unifiedResults.messages.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {unifiedResults.messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => void handleSelectMessage(msg.chatId)}
                          className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                              <span>{msg.chatName || 'Direct Message'}</span>
                              <span className="text-[10px] text-slate-400">
                                • {msg.senderDisplayName}
                              </span>
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                              <Calendar className="w-3 h-3 opacity-60" />
                              <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                          <p
                            className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2"
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
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                      <span>People</span>
                      <span>{unifiedResults.users.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {unifiedResults.users.map((u) => (
                        <div
                          key={u.userId}
                          onClick={() => void handleSelectUser(u.userId)}
                          className="p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
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
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                {u.displayName}
                              </p>
                              <p className="text-[11px] text-slate-400">@{u.username}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Message
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Channels & Groups Section */}
              {(activeTab === 'all' || activeTab === 'chats') &&
                unifiedResults.chats.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                      <span>Channels & Groups</span>
                      <span>{unifiedResults.chats.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {unifiedResults.chats.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => void handleSelectChannel(c.id)}
                          className="p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <Hash className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {c.name}
                              </p>
                              {c.description && (
                                <p className="text-[11px] text-slate-400 truncate">
                                  {c.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
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
