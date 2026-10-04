import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContactStore } from '../store/useContactStore';
import { useProfileStore } from '../store/useProfileStore';
import { useChatStore } from '../store/useChatStore';
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                Contacts & Connections
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your friendships and contact requests
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Daylight Theme Toggle Button */}
            <ThemeToggle />

            <Link
              to="/"
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {/* Success Alert */}
        {actionSuccess && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center space-x-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>My Contacts</span>
            <span className="ml-1.5 px-2 py-0.2 rounded-full text-xs bg-black/20 text-white">
              {contacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition relative ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'add'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
              <div className="text-center py-16 px-4 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 mb-4">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No contacts yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                  Add friends to start messaging them directly with instant end-to-end real-time chat.
                </p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Find People</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.contactId}
                    className="p-4 bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex items-start justify-between space-x-3"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className="relative shrink-0">
                        {contact.avatarUrl ? (
                          <img
                            src={contact.avatarUrl}
                            alt={contact.displayName}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                            {contact.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {contact.displayName}
                        </h4>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                          @{contact.username}
                        </p>
                        {contact.statusMessage && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 italic">
                            "{contact.statusMessage}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleStartChat(contact.userId)}
                        title="Start Chat"
                        className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(contact.userId, contact.displayName)}
                        title="Remove Contact"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                  <span>Incoming Requests</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    {incomingRequests.length}
                  </span>
                </h3>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                  No incoming contact requests at this moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between space-x-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {req.avatarUrl ? (
                          <img
                            src={req.avatarUrl}
                            alt={req.displayName}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold shrink-0">
                            {req.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {req.displayName}
                          </h4>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                            @{req.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleAccept(req.requestId)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.requestId)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                  <span>Sent Requests (Waiting for Response)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    {outgoingRequests.length}
                  </span>
                </h3>
              </div>

              {outgoingRequests.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                  No outgoing contact requests pending.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between space-x-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {req.avatarUrl ? (
                          <img
                            src={req.avatarUrl}
                            alt={req.displayName}
                            className="w-10 h-10 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shrink-0">
                            {req.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {req.displayName}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">@{req.username}</p>
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
            <div className="bg-white dark:bg-slate-900/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Discover & Add People</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Search for friends by username or display name to send a contact invitation.
              </p>

              <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-sm"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Search Results */}
              <div>
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Search Results ({searchResults.length})
                    </p>
                    {searchResults.map((user) => {
                      const isAlreadyContact = contacts.some((c) => c.userId === user.userId);
                      const isOutgoing = outgoingRequests.some((r) => r.userId === user.userId);

                      return (
                        <div
                          key={user.userId}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between space-x-3"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="w-10 h-10 rounded-xl object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {user.displayName}
                              </h4>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
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
                                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : searchQuery.trim() && !isSearching ? (
                  <p className="text-center text-sm text-slate-400 py-6">
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
