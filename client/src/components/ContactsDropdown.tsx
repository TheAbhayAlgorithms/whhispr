import { useState, useEffect, useRef } from 'react';
import { useContactStore } from '../store/useContactStore';
import { useChatStore } from '../store/useChatStore';
import { useSocketStore } from '../store/useSocketStore';
import {
  Users,
  Search,
  MessageSquare,
  Trash2,
  Check,
  X,
  Clock,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { DevicesLoading } from './DevicesLoading';

interface ContactsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearchModal: () => void;
}

export function ContactsDropdown({
  isOpen,
  onClose,
  onOpenSearchModal,
}: ContactsDropdownProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests'>('contacts');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    contacts,
    incomingRequests,
    isLoading,
    fetchContacts,
    fetchRequests,
    removeContact,
    respondToRequest,
  } = useContactStore();

  const { getOrCreateDirectChat } = useChatStore();
  const { onlineUsers } = useSocketStore();

  // Fetch when opened
  useEffect(() => {
    if (isOpen) {
      void fetchContacts();
      void fetchRequests();
      setFilterQuery('');
      setActionSuccess(null);
    }
  }, [isOpen, fetchContacts, fetchRequests]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Delay slightly to prevent the toggle button click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // If requests drop to 0, switch to contacts tab
  useEffect(() => {
    if (incomingRequests.length === 0 && activeTab === 'requests') {
      setActiveTab('contacts');
    }
  }, [incomingRequests.length, activeTab]);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q)
    );
  });

  const handleStartChat = async (targetUserId: string) => {
    try {
      await getOrCreateDirectChat(targetUserId);
      onClose();
    } catch {
      // Handled by store
    }
  };

  const handleRemove = async (targetUserId: string, name: string) => {
    if (!confirm(`Remove ${name} from contacts?`)) return;
    try {
      await removeContact(targetUserId);
      setActionSuccess(`Removed ${name}`);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch {
      // Handled by store
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await respondToRequest(requestId, 'accept');
      setActionSuccess('Request accepted!');
      setTimeout(() => setActionSuccess(null), 2500);
      void fetchContacts();
      void fetchRequests();
    } catch {
      // Handled by store
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await respondToRequest(requestId, 'reject');
      setActionSuccess('Request rejected');
      setTimeout(() => setActionSuccess(null), 2500);
      void fetchRequests();
    } catch {
      // Handled by store
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#141515] border border-[#E5E5E3] dark:border-[#2C2E2E] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label="Contacts Dropdown"
    >
      {/* Header */}
      <div className="p-3 sm:p-3.5 border-b border-[#E5E5E3] dark:border-[#2C2E2E] bg-white dark:bg-[#141515] shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'contacts'
                  ? 'bg-[#20B2AA] text-black shadow-xs'
                  : 'text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contacts</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-black/15 font-bold">
                {contacts.length}
              </span>
            </button>

            {incomingRequests.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-[#20B2AA] text-black shadow-xs'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Requests</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-amber-500 text-black font-bold animate-pulse">
                  {incomingRequests.length}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSearchModal();
              }}
              className="p-1.5 rounded-lg text-[#737878] dark:text-[#9EA3A3] hover:text-[#20B2AA] hover:bg-[#F3F3F2] dark:hover:bg-[#202222] transition cursor-pointer"
              title="Search users to add"
              aria-label="Add Contact"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Filter Input */}
        {activeTab === 'contacts' && contacts.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#737878] dark:text-[#9EA3A3] absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter contacts..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-xs text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] focus:outline-none focus:border-[#20B2AA] transition"
            />
          </div>
        )}
      </div>

      {/* Action feedback */}
      {actionSuccess && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center space-x-1.5">
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Body List */}
      <div className="p-2 sm:p-2.5 overflow-y-auto flex-1 space-y-1.5">
        {activeTab === 'contacts' ? (
          filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => {
              const isOnline = onlineUsers[contact.userId]?.status === 'online';

              return (
                <div
                  key={contact.contactId}
                  className="p-2.5 rounded-xl bg-[#F9F9F8] dark:bg-[#191A1A] hover:bg-[#F3F3F2] dark:hover:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-between space-x-2.5 transition"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="relative shrink-0">
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl}
                          alt={contact.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-[#E5E5E3] dark:border-[#2D3030]"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#E6F7F6] dark:bg-[#202222] border border-[#B2E5E2] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold text-xs">
                          {contact.displayName ? contact.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#141515] ${
                          isOnline ? 'bg-[#20B2AA]' : 'bg-[#8E9393]'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-[#191A1A] dark:text-[#EDEDED] truncate leading-tight">
                        {contact.displayName}
                      </h4>
                      <p className="text-[11px] text-[#20B2AA] font-medium truncate">
                        @{contact.username}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartChat(contact.userId)}
                      className="p-1.5 rounded-lg text-[#20B2AA] hover:bg-[#E6F7F6] dark:hover:bg-[#1D2B29] transition cursor-pointer"
                      title="Start Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(contact.userId, contact.displayName)}
                      className="p-1.5 rounded-lg text-[#737878] dark:text-[#9EA3A3] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : isLoading && contacts.length === 0 ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center">
              <DevicesLoading size="sm" label="Syncing contacts..." />
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#E6F7F6] dark:bg-[#1D2B29] border border-[#B2E5E2] dark:border-[#25423E] flex items-center justify-center text-[#20B2AA] mb-2.5">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-[#191A1A] dark:text-[#EDEDED]">
                No contacts yet
              </h4>
              <p className="text-[11px] text-[#737878] dark:text-[#9EA3A3] mt-1 mb-3">
                Search users by username to add contacts.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSearchModal();
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-black" />
                <span>Search Users</span>
              </button>
            </div>
          ) : (
            <div className="py-6 px-4 text-center">
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                No contacts matching "{filterQuery}"
              </p>
            </div>
          )
        ) : (
          /* Incoming Requests Tab */
          incomingRequests.map((req) => (
            <div
              key={req.requestId}
              className="p-2.5 rounded-xl bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-between space-x-2 transition"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#E6F7F6] dark:bg-[#202222] border border-[#B2E5E2] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold text-xs shrink-0">
                  {req.displayName ? req.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-xs text-[#191A1A] dark:text-[#EDEDED] truncate leading-tight">
                    {req.displayName}
                  </h4>
                  <p className="text-[11px] text-[#20B2AA] truncate">
                    @{req.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAcceptRequest(req.requestId)}
                  disabled={processingId === req.requestId}
                  className="p-1.5 rounded-lg bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs transition cursor-pointer disabled:opacity-50"
                  title="Accept"
                >
                  {processingId === req.requestId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-black" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectRequest(req.requestId)}
                  disabled={processingId === req.requestId}
                  className="p-1.5 rounded-lg text-[#737878] dark:text-[#9EA3A3] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Reject"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
