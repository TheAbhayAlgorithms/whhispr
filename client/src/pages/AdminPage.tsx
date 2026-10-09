import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  Users,
  MessageSquare,
  Hash,
  Search,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
  Crown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { apiRequest } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';

interface AdminStats {
  totalUsers: number;
  totalMessages: number;
  totalChats: number;
  activeUsers: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  isEmailVerified: boolean;
  lastSeen: string | null;
  createdAt: string;
}

interface AdminMessage {
  id: string;
  chatId: string;
  chatType: string;
  chatName: string | null;
  senderId: string | null;
  senderName: string | null;
  senderUsername: string | null;
  content: string;
  type: string;
  isDeleted: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'messages'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const loadData = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setActionMessage(null);
    try {
      const [statsRes, usersRes, msgsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: AdminStats }>('/api/v1/admin/overview'),
        apiRequest<{ success: boolean; data: { users: AdminUser[] } }>('/api/v1/admin/users'),
        apiRequest<{ success: boolean; data: { messages: AdminMessage[] } }>('/api/v1/admin/messages?limit=100'),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setMessages(msgsRes.data.messages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin data';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadData();
    }
  }, [isAdmin]);

  const handleToggleUserStatus = async (targetUserId: string, currentStatus: boolean) => {
    setProcessingId(targetUserId);
    setActionMessage(null);
    try {
      await apiRequest(`/api/v1/admin/users/${targetUserId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isActive: !currentStatus } : u)),
      );
      setActionMessage({
        type: 'success',
        text: `User ${!currentStatus ? 'activated' : 'deactivated/banned'} successfully`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleUserRole = async (targetUserId: string, currentRole: 'user' | 'admin') => {
    setProcessingId(targetUserId);
    setActionMessage(null);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await apiRequest(`/api/v1/admin/users/${targetUserId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)),
      );
      setActionMessage({
        type: 'success',
        text: `User role changed to ${newRole.toUpperCase()} successfully`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change role';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete/censor this message?')) return;
    setProcessingId(messageId);
    setActionMessage(null);
    try {
      await apiRequest(`/api/v1/admin/messages/${messageId}`, {
        method: 'DELETE',
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, content: '[Message deleted by admin]' } : m,
        ),
      );
      setActionMessage({ type: 'success', text: 'Message removed from platform' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete message';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        (m.senderName && m.senderName.toLowerCase().includes(q)) ||
        (m.senderUsername && m.senderUsername.toLowerCase().includes(q)) ||
        (m.chatName && m.chatName.toLowerCase().includes(q)),
    );
  }, [messages, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            You do not have Administrator permissions to access the Whhispr Admin Portal.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between pt-safe">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link
            to="/"
            className="min-w-[44px] min-h-[44px] p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center justify-center shrink-0"
            title="Back to Chat"
            aria-label="Back to Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Admin Portal
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full shrink-0">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Manage users, accounts, and monitor platform messages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => void loadData()}
            disabled={isLoading}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition disabled:opacity-50 flex items-center justify-center active:scale-95"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Banner Alert if any */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-sm ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {actionMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Users
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats?.totalUsers ?? '...'}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Active: {stats?.activeUsers ?? 0}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Messages
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats?.totalMessages ?? '...'}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Real-time message volume
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Conversations
              </span>
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <Hash className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats?.totalChats ?? '...'}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Direct & Group channels
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your Role
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Administrator
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Full system privileges
            </div>
          </div>
        </div>

        {/* Tab Controls & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'messages'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Global Messages ({messages.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'users' ? 'Search by name, @username, email...' : 'Search message content or sender...'
              }
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tab 1: Users Table */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        {users.length === 0
                          ? 'No users registered yet. Register your account to be the first!'
                          : 'No matching users found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === user?.id;
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
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
                                <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                                  <span>{u.displayName}</span>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md font-semibold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  @{u.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-full font-semibold text-[11px]">
                                <Crown className="w-3 h-3" />
                                <span>Admin</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-medium text-[11px]">
                                User
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.isActive ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Banned</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Toggle Role Button */}
                              {!isSelf && (
                                <button
                                  onClick={() => handleToggleUserRole(u.id, u.role)}
                                  disabled={processingId === u.id}
                                  className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-medium transition text-slate-700 dark:text-slate-300 disabled:opacity-50"
                                >
                                  {u.role === 'admin' ? 'Demote' : 'Promote to Admin'}
                                </button>
                              )}

                              {/* Toggle Active / Ban Button */}
                              {!isSelf && (
                                <button
                                  onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                                  disabled={processingId === u.id}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center space-x-1 disabled:opacity-50 ${
                                    u.isActive
                                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  }`}
                                >
                                  {u.isActive ? (
                                    <>
                                      <UserX className="w-3 h-3" />
                                      <span>Ban User</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3 h-3" />
                                      <span>Reactivate</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Messages Moderation Table */}
        {activeTab === 'messages' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Sender</th>
                    <th className="py-3 px-4">Conversation</th>
                    <th className="py-3 px-4">Message Content</th>
                    <th className="py-3 px-4">Sent At</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredMessages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No messages found.
                      </td>
                    </tr>
                  ) : (
                    filteredMessages.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {m.senderName || 'System'}
                          </div>
                          {m.senderUsername && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              @{m.senderUsername}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mb-0.5">
                            {m.chatType}
                          </span>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                            {m.chatName || m.chatId}
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-md">
                          <p
                            className={`text-xs break-words ${
                              m.isDeleted
                                ? 'italic text-rose-500 dark:text-rose-400 line-through'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {m.content}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {!m.isDeleted && (
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              disabled={processingId === m.id}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                              title="Delete Message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
