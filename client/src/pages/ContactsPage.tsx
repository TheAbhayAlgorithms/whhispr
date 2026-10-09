import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContactStore } from '../store/useContactStore';
import { useProfileStore } from '../store/useProfileStore';
import { useChatStore } from '../store/useChatStore';
import { useSocketStore } from '../store/useSocketStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { ContactCardsSkeleton } from '../components/Skeletons';
import {
  Users,
  UserPlus,
  Clock,
  Search,
  Check,
  X,
  Trash2,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function ContactsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests' | 'add'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { getOrCreateDirectChat } = useChatStore();
  const { onlineUsers, queryBatchPresence } = useSocketStore();

  const {
    contacts,
    incomingRequests,
    outgoingRequests,
    isLoading,
    error,
    fetchContacts,
    fetchRequests,
    sendContactRequest,
    respondToRequest,
    removeContact,
  } = useContactStore();

  const { searchResults, isSearching, searchUsers, clearSearch } = useProfileStore();

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }
    void searchUsers(searchQuery.trim());
  };

  const handleSendRequest = async (targetUserId: string) => {
    try {
      const res = await sendContactRequest({ targetUserId });
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(null), 4000);
      void fetchRequests();
    } catch {
      // Error handled by store
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await respondToRequest(requestId, 'accept');
      setActionSuccess('Contact request accepted!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      // Error handled by store
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await respondToRequest(requestId, 'reject');
      setActionSuccess('Contact request rejected');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      // Error handled by store
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
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#141515]/80 backdrop-blur-md border-b border-[#E5E5E3] dark:border-[#2C2E2E] transition-colors duration-200 pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
                Manage your secure contacts and requests
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* Daylight / Dark Theme Toggle Button */}
            <ThemeToggle />

            {/* Back to Chats - Single Symbol Button */}
            <Link
              to="/"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] hover:bg-[#ECECEB] dark:hover:bg-[#262828] text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center transition active:scale-95"
              title="Back to Chats"
              aria-label="Back to Chats"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {/* Success Alert */}
        {actionSuccess && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium flex items-center space-x-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-[#E5E5E3] dark:border-[#2C2E2E] pb-3 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-[#20B2AA] text-black shadow-md shadow-[#20B2AA]/20'
                : 'text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>My Contacts</span>
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

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition relative shrink-0 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-[#20B2AA] text-black shadow-md shadow-[#20B2AA]/20'
                : 'text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === 'add'
                ? 'bg-[#20B2AA] text-black shadow-md shadow-[#20B2AA]/20'
                : 'text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>

        {/* TAB 1: MY CONTACTS */}
        {activeTab === 'contacts' && (
          <div>
            {isLoading && contacts.length === 0 ? (
              <ContactCardsSkeleton count={6} />
            ) : contacts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E6F7F6] dark:bg-[#1D2B29] border border-[#B2E5E2] dark:border-[#25423E] flex items-center justify-center text-[#20B2AA] mb-4">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#191A1A] dark:text-[#EDEDED] mb-1">No contacts yet</h3>
                <p className="text-xs sm:text-sm text-[#737878] dark:text-[#9EA3A3] max-w-sm mx-auto mb-6">
                  Add friends to start messaging them directly with instant end-to-end real-time chat.
                </p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs sm:text-sm font-semibold shadow-md shadow-[#20B2AA]/20 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Find People</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {contacts.map((contact) => {
                  const isOnline = onlineUsers[contact.userId]?.status === 'online';

                  return (
                    <div
                      key={contact.contactId}
                      className="p-4 bg-white dark:bg-[#141515] rounded-2xl border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs hover:border-[#20B2AA]/40 hover:shadow-md transition flex items-start justify-between space-x-3"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className="relative shrink-0">
                          {contact.avatarUrl ? (
                            <img
                              src={contact.avatarUrl}
                              alt={contact.displayName}
                              className="w-12 h-12 rounded-xl object-cover border border-[#E5E5E3] dark:border-[#2D3030]"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold text-lg shadow-xs">
                              {contact.displayName.charAt(0).toUpperCase()}
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
                          <h4 className="font-bold text-xs sm:text-sm text-[#191A1A] dark:text-[#EDEDED] truncate">
                            {contact.displayName}
                          </h4>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <p className="text-xs text-[#20B2AA] font-medium truncate">
                              @{contact.username}
                            </p>
                            <span className="text-[10px] text-[#737878]">&bull;</span>
                            <span
                              className={`text-[10px] font-semibold ${
                                isOnline ? 'text-[#20B2AA]' : 'text-[#737878]'
                              }`}
                            >
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {contact.statusMessage && (
                            <p className="text-xs text-[#737878] dark:text-[#9EA3A3] truncate mt-1 italic">
                              "{contact.statusMessage}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleStartChat(contact.userId)}
                          title="Start Chat"
                          className="p-2 rounded-xl text-[#20B2AA] hover:bg-[#E6F7F6] dark:hover:bg-[#1D2B29] transition cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(contact.userId, contact.displayName)}
                          title="Remove Contact"
                          className="p-2 rounded-xl text-[#737878] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
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

        {/* TAB 2: REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-8">
            {/* Incoming Requests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] flex items-center space-x-2">
                  <span>Incoming Requests</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] text-[#191A1A] dark:text-[#EDEDED] font-semibold">
                    {incomingRequests.length}
                  </span>
                </h3>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-[#141515] rounded-2xl border border-[#E5E5E3] dark:border-[#2C2E2E] text-xs sm:text-sm text-[#737878] dark:text-[#9EA3A3]">
                  No incoming contact requests at this moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-4 bg-white dark:bg-[#141515] rounded-2xl border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs flex items-center justify-between space-x-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {req.avatarUrl ? (
                          <img
                            src={req.avatarUrl}
                            alt={req.displayName}
                            className="w-11 h-11 rounded-xl object-cover border border-[#E5E5E3] dark:border-[#2D3030] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold shrink-0">
                            {req.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-[#191A1A] dark:text-[#EDEDED] truncate">
                            {req.displayName}
                          </h4>
                          <p className="text-xs text-[#20B2AA] font-medium truncate">
                            @{req.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleAccept(req.requestId)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold transition shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-black" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.requestId)}
                          className="p-1.5 rounded-xl text-[#737878] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] flex items-center space-x-2">
                  <span>Sent Requests (Waiting for Response)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] text-[#191A1A] dark:text-[#EDEDED] font-semibold">
                    {outgoingRequests.length}
                  </span>
                </h3>
              </div>

              {outgoingRequests.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-[#141515] rounded-2xl border border-[#E5E5E3] dark:border-[#2C2E2E] text-xs sm:text-sm text-[#737878] dark:text-[#9EA3A3]">
                  No outgoing contact requests pending.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-4 bg-white dark:bg-[#141515] rounded-2xl border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs flex items-center justify-between space-x-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {req.avatarUrl ? (
                          <img
                            src={req.avatarUrl}
                            alt={req.displayName}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#E5E5E3] dark:border-[#2D3030]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#737878] dark:text-[#9EA3A3] font-bold shrink-0">
                            {req.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm text-[#191A1A] dark:text-[#EDEDED] truncate">
                            {req.displayName}
                          </h4>
                          <p className="text-xs text-[#737878] dark:text-[#9EA3A3] truncate">@{req.username}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium flex items-center space-x-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADD CONTACT */}
        {activeTab === 'add' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white dark:bg-[#141515] rounded-3xl p-6 border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-md">
              <div className="flex items-center space-x-2 text-[#20B2AA] mb-2">
                <Sparkles className="w-5 h-5 text-[#20B2AA]" />
                <h3 className="font-bold text-base text-[#191A1A] dark:text-[#EDEDED]">Discover & Add People</h3>
              </div>
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mb-5">
                Search for friends by username or display name to send a secure contact invitation.
              </p>

              <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#737878] dark:text-[#9EA3A3] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-base sm:text-sm text-[#191A1A] dark:text-[#EDEDED] placeholder-[#8E9393] dark:placeholder-[#9EA3A3] focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black font-semibold text-xs sm:text-sm transition shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Search Results */}
              <div>
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-[#737878] dark:text-[#9EA3A3] uppercase tracking-wider">
                      Search Results ({searchResults.length})
                    </p>
                    {searchResults.map((user) => {
                      const isAlreadyContact = contacts.some((c) => c.userId === user.userId);
                      const isOutgoing = outgoingRequests.some((r) => r.userId === user.userId);

                      return (
                        <div
                          key={user.userId}
                          className="p-3.5 rounded-2xl bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-between space-x-3"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#E5E5E3] dark:border-[#2D3030]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#141515] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#20B2AA] font-bold shrink-0">
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs sm:text-sm text-[#191A1A] dark:text-[#EDEDED] truncate">
                                {user.displayName}
                              </h4>
                              <p className="text-xs text-[#20B2AA] truncate">
                                @{user.username}
                              </p>
                            </div>
                          </div>

                          <div>
                            {isAlreadyContact ? (
                              <span className="px-3 py-1 rounded-xl text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                                Contact
                              </span>
                            ) : isOutgoing ? (
                              <span className="px-3 py-1 rounded-xl text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                                Requested
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendRequest(user.userId)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs transition cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-black" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : searchQuery.trim() && !isSearching ? (
                  <p className="text-center text-xs sm:text-sm text-[#737878] dark:text-[#9EA3A3] py-6">
                    No users found matching "{searchQuery}"
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
