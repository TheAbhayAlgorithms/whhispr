import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContactStore } from '../store/useContactStore';
import { useChatStore } from '../store/useChatStore';
import { useSocketStore } from '../store/useSocketStore';
import { ContactCardsSkeleton } from '../components/Skeletons';
import { UserSearchModal } from '../components/UserSearchModal';
import {
  Users,
  Clock,
  Search,
  Check,
  X,
  Trash2,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests'>('contacts');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const { getOrCreateDirectChat } = useChatStore();
  const { onlineUsers, queryBatchPresence } = useSocketStore();

  const {
    contacts,
    incomingRequests,
    isLoading,
    error,
    fetchContacts,
    fetchRequests,
    respondToRequest,
    removeContact,
  } = useContactStore();

  useEffect(() => {
    void fetchContacts();
    void fetchRequests();
  }, [fetchContacts, fetchRequests]);

  useEffect(() => {
    if (contacts.length > 0) {
      const ids = contacts.map((c) => c.userId);
      void queryBatchPresence(ids);
    }
  }, [contacts, queryBatchPresence]);

  // If there are no incoming requests and activeTab was 'requests', switch back to 'contacts'
  useEffect(() => {
    if (incomingRequests.length === 0 && activeTab === 'requests') {
      setActiveTab('contacts');
    }
  }, [incomingRequests.length, activeTab]);

  const handleAccept = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await respondToRequest(requestId, 'accept');
      setActionSuccess('Contact request accepted!');
      setTimeout(() => setActionSuccess(null), 3000);
      void fetchContacts();
      void fetchRequests();
    } catch {
      // Error handled by store
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await respondToRequest(requestId, 'reject');
      setActionSuccess('Contact request rejected');
      setTimeout(() => setActionSuccess(null), 3000);
      void fetchRequests();
    } catch {
      // Error handled by store
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRemove = async (targetUserId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from your contacts?`)) return;
    try {
      await removeContact(targetUserId);
      setActionSuccess(`Removed ${name} from contacts`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      // Error handled by store
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    try {
      await getOrCreateDirectChat(targetUserId);
      navigate('/');
    } catch {
      // Handled by store
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] flex flex-col transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#141515]/80 backdrop-blur-md border-b border-[#E5E5E3] dark:border-[#2C2E2E] transition-colors duration-200 pt-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
            <Link
              to="/"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] bg-[#F3F3F2] dark:bg-[#202222] hover:bg-[#ECECEB] dark:hover:bg-[#262828] border border-[#E5E5E3] dark:border-[#2D3030] transition flex items-center justify-center shrink-0 active:scale-95"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#20B2AA] flex items-center justify-center text-black shadow-md shadow-[#20B2AA]/20 shrink-0 font-bold">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#191A1A] dark:text-[#EDEDED] tracking-tight leading-tight truncate">
                Contacts
              </h1>
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3] hidden sm:block">
                {contacts.length} secure contact{contacts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* Search Platform Users Button */}
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] hover:bg-[#ECECEB] dark:hover:bg-[#262828] text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Search users to add"
              aria-label="Search users to add"
            >
              <Search className="w-4 h-4 text-[#20B2AA]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {/* Success Alert */}
        {actionSuccess && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium flex items-center space-x-2 animate-fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Control Bar: Contacts button and optional Requests button */}
        <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-[#E5E5E3] dark:border-[#2C2E2E]">
          {/* Direct Contacts Button */}
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-[#20B2AA] text-black shadow-md shadow-[#20B2AA]/20'
                : 'text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Contacts</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'contacts'
                  ? 'bg-black/20 text-black'
                  : 'bg-[#F3F3F2] dark:bg-[#202222] text-[#737878] dark:text-[#9EA3A3]'
              }`}
            >
              {contacts.length}
            </span>
          </button>

          {/* Requests Option Button - shown ONLY when there are new requests, otherwise not displayed */}
          {incomingRequests.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer animate-fade-in ${
                activeTab === 'requests'
                  ? 'bg-[#20B2AA] text-black shadow-md shadow-[#20B2AA]/20'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Requests</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black animate-pulse">
                {incomingRequests.length}
              </span>
            </button>
          )}
        </div>

        {/* TAB 1: CONTACTS IN ROW LIST FORMAT */}
        {activeTab === 'contacts' && (
          <div>
            {isLoading && contacts.length === 0 ? (
              <ContactCardsSkeleton count={5} />
            ) : contacts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E6F7F6] dark:bg-[#1D2B29] border border-[#B2E5E2] dark:border-[#25423E] flex items-center justify-center text-[#20B2AA] mb-4">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#191A1A] dark:text-[#EDEDED] mb-1">
                  No contacts yet
                </h3>
                <p className="text-xs sm:text-sm text-[#737878] dark:text-[#9EA3A3] max-w-sm mx-auto mb-6">
                  Search users by username to add contacts and start end-to-end encrypted conversations.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs sm:text-sm font-semibold shadow-md shadow-[#20B2AA]/20 transition cursor-pointer"
                >
                  <Search className="w-4 h-4 text-black" />
                  <span>Search Users by Username</span>
                </button>
              </div>
            ) : (
              /* Contacts shown in a clean row list format */
              <div className="flex flex-col space-y-2.5">
                {contacts.map((contact) => {
                  const isOnline = onlineUsers[contact.userId]?.status === 'online';

                  return (
                    <div
                      key={contact.contactId}
                      className="p-3.5 sm:p-4 bg-white dark:bg-[#141515] hover:bg-[#F9F9F8] dark:hover:bg-[#191A1A] rounded-2xl border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs hover:border-[#20B2AA]/40 transition flex items-center justify-between space-x-3.5"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="relative shrink-0">
                          {contact.avatarUrl ? (
                            <img
                              src={contact.avatarUrl}
                              alt={contact.displayName}
                              className="w-11 h-11 rounded-full object-cover border border-[#E5E5E3] dark:border-[#2D3030]"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-[#E6F7F6] dark:bg-[#202222] border border-[#B2E5E2] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold text-sm shadow-xs">
                              {contact.displayName ? contact.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#141515] ${
                              isOnline ? 'bg-[#20B2AA]' : 'bg-[#8E9393]'
                            }`}
                            title={isOnline ? 'Online' : 'Offline'}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-xs sm:text-sm text-[#191A1A] dark:text-[#EDEDED] truncate">
                              {contact.displayName}
                            </h4>
                            <span className="text-[10px] text-[#737878] dark:text-[#9EA3A3]">
                              @{contact.username}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span
                              className={`text-[11px] font-medium ${
                                isOnline ? 'text-[#20B2AA]' : 'text-[#737878] dark:text-[#9EA3A3]'
                              }`}
                            >
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                            {contact.statusMessage && (
                              <>
                                <span className="text-[10px] text-[#737878]">&bull;</span>
                                <span className="text-[11px] text-[#737878] dark:text-[#9EA3A3] truncate italic">
                                  "{contact.statusMessage}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleStartChat(contact.userId)}
                          title="Start Chat"
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#20B2AA] hover:bg-[#E6F7F6] dark:hover:bg-[#1D2B29] border border-[#B2E5E2]/40 dark:border-[#25423E]/40 transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Message</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(contact.userId, contact.displayName)}
                          title="Remove Contact"
                          className="p-2 rounded-xl text-[#737878] dark:text-[#9EA3A3] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          aria-label="Remove Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REQUESTS (ONLY SHOWN WHEN THERE ARE REQUESTS) */}
        {activeTab === 'requests' && incomingRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] flex items-center space-x-2">
              <span>Incoming Contact Requests</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 border border-amber-500/30 text-amber-500 font-semibold">
                {incomingRequests.length}
              </span>
            </h3>

            <div className="flex flex-col space-y-2.5">
              {incomingRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="p-3.5 sm:p-4 bg-white dark:bg-[#141515] rounded-2xl border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs flex items-center justify-between space-x-3.5"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative shrink-0">
                      {req.avatarUrl ? (
                        <img
                          src={req.avatarUrl}
                          alt={req.displayName}
                          className="w-11 h-11 rounded-full object-cover border border-[#E5E5E3] dark:border-[#2D3030]"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#E6F7F6] dark:bg-[#202222] border border-[#B2E5E2] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold text-sm">
                          {req.displayName ? req.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-[#191A1A] dark:text-[#EDEDED] truncate">
                        {req.displayName}
                      </h4>
                      <p className="text-xs text-[#20B2AA] font-medium truncate">
                        @{req.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleAccept(req.requestId)}
                      disabled={processingRequestId === req.requestId}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {processingRequestId === req.requestId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-black" />
                      )}
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(req.requestId)}
                      disabled={processingRequestId === req.requestId}
                      className="p-2 rounded-xl text-[#737878] dark:text-[#9EA3A3] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Reject"
                      aria-label="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </div>
  );
}
