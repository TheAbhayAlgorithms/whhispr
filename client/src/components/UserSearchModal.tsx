import { useState, useEffect, useRef } from 'react';
import { useProfileStore } from '../store/useProfileStore';
import { useContactStore } from '../store/useContactStore';
import {
  Search,
  X,
  UserPlus,
  Check,
  Clock,
  Loader2,
  Users,
} from 'lucide-react';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSearchModal({ isOpen, onClose }: UserSearchModalProps) {
  const [query, setQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [requestingUserId, setRequestingUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { searchResults, isSearching, searchUsers, clearSearch } = useProfileStore();
  const {
    contacts,
    outgoingRequests,
    incomingRequests,
    sendContactRequest,
    respondToRequest,
    fetchRequests,
    fetchContacts,
  } = useContactStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      void fetchContacts();
      void fetchRequests();
    } else {
      setQuery('');
      clearSearch();
      setActionSuccess(null);
    }
  }, [isOpen, clearSearch, fetchContacts, fetchRequests]);

  useEffect(() => {
    const trimmed = query.trim().replace(/^@/, '');
    if (!trimmed) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => {
      void searchUsers(trimmed);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchUsers, clearSearch]);

  const handleSendRequest = async (targetUserId: string) => {
    setRequestingUserId(targetUserId);
    try {
      const res = await sendContactRequest({ targetUserId });
      setActionSuccess(res.message || 'Contact request sent!');
      setTimeout(() => setActionSuccess(null), 3000);
      void fetchRequests();
    } catch {
      // Handled in store
    } finally {
      setRequestingUserId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await respondToRequest(requestId, 'accept');
      setActionSuccess('Contact request accepted!');
      setTimeout(() => setActionSuccess(null), 3000);
      void fetchContacts();
      void fetchRequests();
    } catch {
      // Handled in store
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141515] border border-[#E5E5E3] dark:border-[#2C2E2E] rounded-3xl sm:rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up mt-12 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search Bar */}
        <div className="p-4 sm:p-4.5 border-b border-[#E5E5E3] dark:border-[#2C2E2E] flex items-center space-x-3 bg-white dark:bg-[#141515] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#E6F7F6] dark:bg-[#1D2B29] border border-[#B2E5E2] dark:border-[#25423E] flex items-center justify-center text-[#20B2AA] shrink-0">
            <Search className="w-4 h-4 text-[#20B2AA]" />
          </div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Search users by username (e.g. @john)..."
              className="w-full bg-transparent border-none text-sm sm:text-base text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] focus:outline-none"
            />
          </div>
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin text-[#20B2AA] shrink-0" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] hover:bg-[#ECECEB] dark:hover:bg-[#262828] text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action feedback toast */}
        {actionSuccess && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center space-x-2 animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Search Results Area */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2">
          {searchResults.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#737878] dark:text-[#9EA3A3] uppercase tracking-wider px-2 py-1">
                Users ({searchResults.length})
              </p>
              {searchResults.map((user) => {
                const isContact = contacts.some((c) => c.userId === user.userId);
                const isPendingSent = outgoingRequests.some((r) => r.userId === user.userId);
                const incomingReq = incomingRequests.find((r) => r.userId === user.userId);
                const isCurrentRequesting = requestingUserId === user.userId;

                return (
                  <div
                    key={user.userId}
                    className="p-3 sm:p-3.5 rounded-2xl bg-[#F9F9F8] dark:bg-[#191A1A] hover:bg-[#F3F3F2] dark:hover:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-between space-x-3 transition"
                  >
                    {/* User info */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-[#E5E5E3] dark:border-[#2D3030]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#E6F7F6] dark:bg-[#202222] border border-[#B2E5E2] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold text-sm">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED] truncate">
                          {user.displayName}
                        </h4>
                        <p className="text-xs text-[#20B2AA] font-medium truncate">
                          @{user.username}
                        </p>
                        {user.bio && (
                          <p className="text-[11px] text-[#737878] dark:text-[#9EA3A3] truncate mt-0.5">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side: Add option if NOT added; if added, NO add option */}
                    <div className="shrink-0 ml-2">
                      {isContact ? (
                        /* Already Added: NO option of add */
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-[#E6F7F6] dark:bg-[#1D2B29] text-[#20B2AA] border border-[#B2E5E2] dark:border-[#25423E]">
                          <Check className="w-3.5 h-3.5 text-[#20B2AA]" />
                          <span>Contact</span>
                        </span>
                      ) : isPendingSent ? (
                        /* Request already sent: no add option */
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Requested</span>
                        </span>
                      ) : incomingReq ? (
                        /* Incoming request from this user */
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(incomingReq.requestId)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                      ) : (
                        /* NOT added: Show Add button */
                        <button
                          type="button"
                          onClick={() => handleSendRequest(user.userId)}
                          disabled={isCurrentRequesting}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isCurrentRequesting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5 text-black" />
                          )}
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : query.trim() && !isSearching ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#737878] dark:text-[#9EA3A3] mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                No users found
              </h4>
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-1">
                No matching username found for "{query.trim()}"
              </p>
            </div>
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                Search Users by Username
              </h4>
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-1 max-w-xs mx-auto">
                Type a username to discover and add contacts on ComeOver.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
