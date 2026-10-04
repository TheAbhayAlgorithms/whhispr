import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Lock,
  Laptop,
  Smartphone,
  Globe,
  Bell,
  Sun,
  Moon,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useSettingsStore } from '../store/useSettingsStore';

type SettingsTab = 'appearance' | 'account' | 'sessions' | 'notifications' | 'privacy';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const {
    sessions,
    isLoadingSessions,
    isUpdatingPassword,
    isDeletingAccount,
    actionMessage,
    notifPrefs,
    privacyPrefs,
    fetchSessions,
    revokeSession,
    revokeOtherSessions,
    changePassword,
    deleteAccount,
    updateNotifPrefs,
    updatePrivacyPrefs,
    clearActionMessage,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Push notification permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => {
        clearActionMessage();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage, clearActionMessage]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setPasswordError('Password must contain uppercase, lowercase, and a digit.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(msg);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError('Password is required.');
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('You must type DELETE to confirm.');
      return;
    }

    try {
      await deleteAccount(deletePassword);
      logout();
      navigate('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      setDeleteError(msg);
    }
  };

  const handleRequestPushPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        updateNotifPrefs({ desktopNotifications: true });
      } else {
        updateNotifPrefs({ desktopNotifications: false });
      }
    }
  };

  const getDeviceIcon = (ua: string | null) => {
    if (!ua) return <Globe className="w-5 h-5 text-indigo-500" />;
    const lower = ua.toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="w-5 h-5 text-indigo-500" />;
    }
    return <Laptop className="w-5 h-5 text-indigo-500" />;
  };

  const parseBrowser = (ua: string | null) => {
    if (!ua) return 'Web Browser';
    if (ua.includes('Chrome')) return 'Google Chrome';
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('Safari')) return 'Apple Safari';
    if (ua.includes('Edge')) return 'Microsoft Edge';
    return 'Web Client';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Sliders className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Settings & Preferences
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Signed in as</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              @{user?.username}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Toast / Global Action Message */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center space-x-3 text-sm shadow-sm transition animate-in fade-in slide-in-from-top-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <p className="font-medium flex-1">{actionMessage.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar */}
          <aside className="md:col-span-4 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-2 shadow-sm">
            <nav className="flex flex-col space-y-1">
              <button
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-2xl font-medium text-sm transition text-left ${
                  activeTab === 'appearance'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Sun className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Appearance</div>
                  <div
                    className={`text-xs ${
                      activeTab === 'appearance'
                        ? 'text-indigo-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Theme and display style
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-2xl font-medium text-sm transition text-left ${
                  activeTab === 'account'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Account & Security</div>
                  <div
                    className={`text-xs ${
                      activeTab === 'account'
                        ? 'text-indigo-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Password and account safety
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-2xl font-medium text-sm transition text-left ${
                  activeTab === 'sessions'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Laptop className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Active Sessions</div>
                  <div
                    className={`text-xs ${
                      activeTab === 'sessions'
                        ? 'text-indigo-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Manage connected devices
                  </div>
                </div>
                {sessions.length > 1 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'sessions'
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    }`}
                  >
                    {sessions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-2xl font-medium text-sm transition text-left ${
                  activeTab === 'notifications'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Notifications</div>
                  <div
                    className={`text-xs ${
                      activeTab === 'notifications'
                        ? 'text-indigo-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Alerts, tones, and previews
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-2xl font-medium text-sm transition text-left ${
                  activeTab === 'privacy'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Privacy & E2EE</div>
                  <div
                    className={`text-xs ${
                      activeTab === 'privacy'
                        ? 'text-indigo-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Read receipts & encryption
                  </div>
                </div>
              </button>
            </nav>
          </aside>

          {/* Tab Content Panels */}
          <div className="md:col-span-8 space-y-6">
            {/* 1. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Appearance</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Customize how Whispr looks and feels across your workspace.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 block mb-3">
                    Color Mode
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`relative p-5 rounded-2xl border-2 text-left flex flex-col items-center space-y-3 transition group ${
                        theme === 'light'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Sun className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          Light Mode
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Clean, crisp daylight palette
                        </p>
                      </div>
                      {theme === 'light' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`relative p-5 rounded-2xl border-2 text-left flex flex-col items-center space-y-3 transition group ${
                        theme === 'dark'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-900/60 text-indigo-400 flex items-center justify-center">
                        <Moon className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          Dark Mode
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Sleek, eye-friendly contrast
                        </p>
                      </div>
                      {theme === 'dark' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Message Density
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Whispr automatically formats bubbles for comfortable reading
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Comfortable
                  </span>
                </div>
              </div>
            )}

            {/* 2. ACCOUNT & SECURITY TAB */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Change Password Card */}
                <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Change Password
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ensure your account is using a long, random password
                      </p>
                    </div>
                  </div>

                  {passwordSuccess && (
                    <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showCurrentPw ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 8 chars, uppercase & digit"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showNewPw ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isUpdatingPassword ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <span>Update Password</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Account Details Overview */}
                <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block mb-1">Email Address</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {user?.email}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block mb-1">User Handle</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        @{user?.username}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone: Delete Account */}
                <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/50 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Danger Zone</span>
                      </h3>
                      <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1 max-w-md">
                        Permanently deactivate your Whispr account, revoke all credentials, and
                        remove your profile from directories.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-sm flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACTIVE SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Active Sessions
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Devices currently signed in to your Whispr account.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchSessions()}
                      disabled={isLoadingSessions}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                      title="Refresh Sessions"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`}
                      />
                    </button>
                    {sessions.length > 1 && (
                      <button
                        onClick={() => revokeOtherSessions()}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold transition"
                      >
                        Sign Out Other Devices
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
                          {getDeviceIcon(session.userAgent)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {parseBrowser(session.userAgent)}
                            </span>
                            {session.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Current Device</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-3">
                            <span>IP: {session.ipAddress || '127.0.0.1'}</span>
                            <span>•</span>
                            <span>Signed in {new Date(session.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          onClick={() => revokeSession(session.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}

                  {sessions.length === 0 && !isLoadingSessions && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No active sessions found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Control how and when Whispr alerts you about messages and calls.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Push Permission Request */}
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Desktop Push Notifications
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Permission status:{' '}
                        <span className="font-semibold capitalize text-indigo-600 dark:text-indigo-400">
                          {notificationPermission}
                        </span>
                      </p>
                    </div>
                    {notificationPermission !== 'granted' ? (
                      <button
                        onClick={handleRequestPushPermission}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm"
                      >
                        Enable Notifications
                      </button>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>Enabled</span>
                      </span>
                    )}
                  </div>

                  {/* Sound on Messages */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Message Sound Alerts
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Play an audible chime when new direct messages arrive
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateNotifPrefs({ messageSounds: !notifPrefs.messageSounds })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                        notifPrefs.messageSounds ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          notifPrefs.messageSounds ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Call Ringtone */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Incoming Call Ringtone
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Play continuous ringtone during incoming WebRTC voice & video calls
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateNotifPrefs({ callRingtone: !notifPrefs.callRingtone })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                        notifPrefs.callRingtone ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          notifPrefs.callRingtone ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Message Preview */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Message Content Previews
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Show sender and message snippet in banner notifications
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateNotifPrefs({ messagePreview: !notifPrefs.messagePreview })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                        notifPrefs.messagePreview ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          notifPrefs.messagePreview ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PRIVACY & E2EE TAB */}
            {activeTab === 'privacy' && (
              <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Privacy & End-to-End Encryption
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage message read status, online visibility, and cryptographic protections.
                  </p>
                </div>

                {/* E2EE Status Card */}
                <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        End-to-End Encryption Protocol
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      All 1-on-1 private conversations and media attachments are cryptographically
                      secured via ECDH key exchange and AES-256-GCM. Whispr servers cannot inspect
                      your private message content.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Read Receipts */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Read Receipts
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Allow contacts to see when you have opened and read their messages
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updatePrivacyPrefs({ readReceipts: !privacyPrefs.readReceipts })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                        privacyPrefs.readReceipts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          privacyPrefs.readReceipts ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Online Status */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Online Status
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Show a green indicator when you are actively using Whispr
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updatePrivacyPrefs({
                          showOnlineStatus: !privacyPrefs.showOnlineStatus,
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                        privacyPrefs.showOnlineStatus
                          ? 'bg-indigo-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          privacyPrefs.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Account Permanently?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                This action is irreversible. All your personal profile data, contacts, and active
                sessions will be deactivated immediately.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type <span className="font-mono text-rose-600 font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isDeletingAccount ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Deletion</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
