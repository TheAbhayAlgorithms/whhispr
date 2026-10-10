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
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { DevicesLoading } from '../components/DevicesLoading';
import JellyRadio from '../components/JellyRadio';

type SettingsTab = 'appearance' | 'account' | 'sessions' | 'notifications' | 'privacy';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [messageDensity, setMessageDensity] = useState<'Compact' | 'Comfortable' | 'Spacious'>('Comfortable');
  const [jellyPhysics, setJellyPhysics] = useState<string>('Medium');
  const [alertChimeLevel, setAlertChimeLevel] = useState<string>('Medium');
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

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
    if (!ua) return <Globe className="w-5 h-5 text-[#20B2AA]" />;
    const lower = ua.toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="w-5 h-5 text-[#20B2AA]" />;
    }
    return <Laptop className="w-5 h-5 text-[#20B2AA]" />;
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
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-[#E5E5E3] dark:border-[#2C2E2E] bg-white/90 dark:bg-[#141515]/90 backdrop-blur-md sticky top-0 z-50 pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <Link
              to="/"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F3F3F2] hover:bg-[#E5E5E3] dark:bg-[#202222] dark:hover:bg-[#262828] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#191A1A] dark:text-[#EDEDED] transition shrink-0 active:scale-95"
              title="Return to Dashboard"
              aria-label="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#20B2AA]/15 text-[#20B2AA] flex items-center justify-center font-bold shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#191A1A] dark:text-[#EDEDED] tracking-tight truncate">
                Settings
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-[#737878] dark:text-[#9EA3A3] shrink-0">
            <span className="hidden sm:inline">Signed in as</span>
            <span className="font-semibold text-[#191A1A] dark:text-[#EDEDED] px-2.5 py-1 rounded-full bg-[#F3F3F2] dark:bg-[#202222] border border-[#E5E5E3] dark:border-[#2D3030] truncate max-w-[120px] sm:max-w-none">
              @{user?.username}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Toast / Global Action Message */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center space-x-3 text-sm shadow-sm transition animate-in fade-in slide-in-from-top-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <p className="font-medium flex-1">{actionMessage.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Navigation Sidebar: Horizontal scrollable on mobile, vertical card on desktop */}
          <aside className="md:col-span-4 lg:col-span-3 bg-white dark:bg-[#141515] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-2 sm:p-2.5 shadow-sm overflow-hidden">
            <nav className="flex md:flex-col overflow-x-auto no-scrollbar gap-1.5 md:space-y-1">
              <button
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center space-x-2.5 md:space-x-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl font-medium text-xs md:text-sm transition text-left shrink-0 md:w-full cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'bg-[#20B2AA] text-black font-bold shadow-md shadow-[#20B2AA]/20'
                    : 'text-[#191A1A] dark:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
                }`}
              >
                <Sun className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Appearance</div>
                  <div
                    className={`hidden md:block text-xs ${
                      activeTab === 'appearance'
                        ? 'text-black/70'
                        : 'text-[#737878] dark:text-[#9EA3A3]'
                    }`}
                  >
                    Theme and display style
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center space-x-2.5 md:space-x-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl font-medium text-xs md:text-sm transition text-left shrink-0 md:w-full cursor-pointer ${
                  activeTab === 'account'
                    ? 'bg-[#20B2AA] text-black font-bold shadow-md shadow-[#20B2AA]/20'
                    : 'text-[#191A1A] dark:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Account & Security</div>
                  <div
                    className={`hidden md:block text-xs ${
                      activeTab === 'account'
                        ? 'text-black/70'
                        : 'text-[#737878] dark:text-[#9EA3A3]'
                    }`}
                  >
                    Password and account safety
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('sessions')}
                className={`flex items-center space-x-2.5 md:space-x-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl font-medium text-xs md:text-sm transition text-left shrink-0 md:w-full cursor-pointer ${
                  activeTab === 'sessions'
                    ? 'bg-[#20B2AA] text-black font-bold shadow-md shadow-[#20B2AA]/20'
                    : 'text-[#191A1A] dark:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
                }`}
              >
                <Laptop className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Active Sessions</div>
                  <div
                    className={`hidden md:block text-xs ${
                      activeTab === 'sessions'
                        ? 'text-black/70'
                        : 'text-[#737878] dark:text-[#9EA3A3]'
                    }`}
                  >
                    Manage connected devices
                  </div>
                </div>
                {sessions.length > 1 && (
                  <span
                    className={`px-1.5 py-0.2 md:px-2 md:py-0.5 rounded-full text-[10px] md:text-xs font-semibold ${
                      activeTab === 'sessions'
                        ? 'bg-black/20 text-black'
                        : 'bg-[#20B2AA]/15 text-[#20B2AA]'
                    }`}
                  >
                    {sessions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center space-x-2.5 md:space-x-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl font-medium text-xs md:text-sm transition text-left shrink-0 md:w-full cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-[#20B2AA] text-black font-bold shadow-md shadow-[#20B2AA]/20'
                    : 'text-[#191A1A] dark:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Notifications</div>
                  <div
                    className={`hidden md:block text-xs ${
                      activeTab === 'notifications'
                        ? 'text-black/70'
                        : 'text-[#737878] dark:text-[#9EA3A3]'
                    }`}
                  >
                    Alerts, tones, and previews
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center space-x-2.5 md:space-x-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl font-medium text-xs md:text-sm transition text-left shrink-0 md:w-full cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-[#20B2AA] text-black font-bold shadow-md shadow-[#20B2AA]/20'
                    : 'text-[#191A1A] dark:text-[#EDEDED] hover:bg-[#F3F3F2] dark:hover:bg-[#202222]'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <div>Privacy & E2EE</div>
                  <div
                    className={`hidden md:block text-xs ${
                      activeTab === 'privacy'
                        ? 'text-black/70'
                        : 'text-[#737878] dark:text-[#9EA3A3]'
                    }`}
                  >
                    Read receipts & encryption
                  </div>
                </div>
              </button>
            </nav>
          </aside>

          {/* Tab Content Panels */}
          <div className="md:col-span-8 lg:col-span-6 space-y-6">
            {/* 1. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#191A1A] dark:text-[#EDEDED]">Appearance</h2>
                  <p className="text-sm text-[#737878] dark:text-[#9EA3A3] mt-1">
                    Customize how ComeOver looks and feels across your workspace.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E5E5E3] dark:border-[#2D3030]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <label className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED] block">
                      Color Mode
                    </label>
                    <JellyRadio
                      items={[
                        { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
                        { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> }
                      ]}
                      value={theme}
                      onChange={(val) => setTheme(val as 'light' | 'dark')}
                      chipColor={theme === 'dark' ? '#202222' : '#F3F3F2'}
                      activeColor="#20B2AA"
                      textColor={theme === 'dark' ? '#9EA3A3' : '#737878'}
                      activeTextColor="#000000"
                      size="sm"
                      gap={6}
                      radius={16}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`relative p-5 rounded-2xl border-2 text-left flex flex-col items-center space-y-3 transition group cursor-pointer ${
                        theme === 'light'
                          ? 'border-[#20B2AA] bg-[#20B2AA]/10 shadow-sm'
                          : 'border-[#E5E5E3] dark:border-[#2D3030] hover:border-[#20B2AA]/40 bg-[#F9F9F8] dark:bg-[#191A1A]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                        <Sun className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm text-[#191A1A] dark:text-[#EDEDED]">
                          Light Mode
                        </p>
                        <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-0.5">
                          Clean, crisp daylight palette
                        </p>
                      </div>
                      {theme === 'light' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#20B2AA] text-black flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`relative p-5 rounded-2xl border-2 text-left flex flex-col items-center space-y-3 transition group cursor-pointer ${
                        theme === 'dark'
                          ? 'border-[#20B2AA] bg-[#20B2AA]/10 shadow-sm'
                          : 'border-[#E5E5E3] dark:border-[#2D3030] hover:border-[#20B2AA]/40 bg-[#F9F9F8] dark:bg-[#191A1A]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#20B2AA]/15 text-[#20B2AA] flex items-center justify-center">
                        <Moon className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm text-[#191A1A] dark:text-[#EDEDED]">
                          Dark Mode
                        </p>
                        <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-0.5">
                          Sleek, eye-friendly contrast
                        </p>
                      </div>
                      {theme === 'dark' && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#20B2AA] text-black flex items-center justify-center text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Message Density with JellyRadio */}
                <div className="pt-6 border-t border-[#E5E5E3] dark:border-[#2D3030] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                      Message Density
                    </h3>
                    <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-0.5">
                      Adjust conversation row spacing and message bubble padding
                    </p>
                  </div>
                  <JellyRadio
                    items={['Compact', 'Comfortable', 'Spacious']}
                    value={messageDensity}
                    onChange={(val) => setMessageDensity(val as 'Compact' | 'Comfortable' | 'Spacious')}
                    chipColor={theme === 'dark' ? '#202222' : '#F3F3F2'}
                    activeColor="#20B2AA"
                    textColor={theme === 'dark' ? '#9EA3A3' : '#737878'}
                    activeTextColor="#000000"
                    size="md"
                    radius={18}
                    swell={0.18}
                    barge={5}
                    bounce={0.25}
                  />
                </div>

                {/* Micro-Animation Spring Physics with JellyRadio */}
                <div className="pt-6 border-t border-[#E5E5E3] dark:border-[#2D3030] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#20B2AA]" />
                      <h3 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Micro-Animation Physics
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20B2AA]/15 text-[#20B2AA] border border-[#20B2AA]/25">
                        JELLY SPRING
                      </span>
                    </div>
                    <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-0.5">
                      Tune spring stiffness, jelly recoil, and tactile feedback
                    </p>
                  </div>
                  <JellyRadio
                    items={['Off', 'Low', 'Medium', 'High', 'Max']}
                    value={jellyPhysics}
                    onChange={(val) => setJellyPhysics(val)}
                    chipColor={theme === 'dark' ? '#202222' : '#F3F3F2'}
                    activeColor="#20B2AA"
                    textColor={theme === 'dark' ? '#9EA3A3' : '#737878'}
                    activeTextColor="#000000"
                    size="md"
                    gap={8}
                    radius={18}
                    swell={0.2}
                    barge={6}
                    shrink={0.05}
                    jelly={1}
                    bounce={0.25}
                    stagger={22}
                    stiffness={580}
                  />
                </div>
              </div>
            )}

            {/* 2. ACCOUNT & SECURITY TAB */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Change Password Card */}
                <div className="bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#20B2AA]/15 text-[#20B2AA] flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#191A1A] dark:text-[#EDEDED]">
                        Change Password
                      </h2>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                        Ensure your account is using a long, random password
                      </p>
                    </div>
                  </div>

                  {passwordSuccess && (
                    <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#737878] dark:text-[#9EA3A3] mb-1.5 uppercase tracking-wider">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] text-base sm:text-sm focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] pr-10 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-3 top-2.5 text-[#737878] hover:text-[#191A1A] dark:hover:text-[#EDEDED] transition cursor-pointer"
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
                        <label className="block text-xs font-semibold text-[#737878] dark:text-[#9EA3A3] mb-1.5 uppercase tracking-wider">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 8 chars, uppercase & digit"
                            className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] text-base sm:text-sm focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] pr-10 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-2.5 text-[#737878] hover:text-[#191A1A] dark:hover:text-[#EDEDED] transition cursor-pointer"
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
                        <label className="block text-xs font-semibold text-[#737878] dark:text-[#9EA3A3] mb-1.5 uppercase tracking-wider">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] text-base sm:text-sm focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] transition"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black font-semibold text-xs transition shadow-md shadow-[#20B2AA]/20 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
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
                <div className="bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-6 sm:p-8 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-[#191A1A] dark:text-[#EDEDED]">
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030]">
                      <span className="text-[#737878] dark:text-[#9EA3A3] block mb-1">Email Address</span>
                      <span className="font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        {user?.email}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030]">
                      <span className="text-[#737878] dark:text-[#9EA3A3] block mb-1">User Handle</span>
                      <span className="font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        @{user?.username}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone: Delete Account */}
                <div className="bg-rose-500/5 dark:bg-rose-500/10 rounded-3xl border border-rose-500/20 dark:border-rose-500/30 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Danger Zone</span>
                      </h3>
                      <p className="text-xs text-rose-500/80 dark:text-rose-400/80 mt-1 max-w-md">
                        Permanently deactivate your ComeOver account, revoke all credentials, and
                        remove your profile from directories.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-sm flex items-center space-x-1.5 cursor-pointer active:scale-95"
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
              <div className="bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#191A1A] dark:text-[#EDEDED]">
                      Active Sessions
                    </h2>
                    <p className="text-sm text-[#737878] dark:text-[#9EA3A3] mt-1">
                      Devices currently signed in to your ComeOver account.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchSessions()}
                      disabled={isLoadingSessions}
                      className="p-2 rounded-xl bg-[#F3F3F2] hover:bg-[#E5E5E3] dark:bg-[#202222] dark:hover:bg-[#262828] border border-[#E5E5E3] dark:border-[#2D3030] text-[#191A1A] dark:text-[#EDEDED] transition cursor-pointer"
                      title="Refresh Sessions"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin text-[#20B2AA]' : ''}`}
                      />
                    </button>
                    {sessions.length > 1 && (
                      <button
                        onClick={() => revokeOtherSessions()}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition cursor-pointer"
                      >
                        Sign Out Other Devices
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {isLoadingSessions && sessions.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <DevicesLoading size="md" label="Loading connected devices..." />
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 rounded-2xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F3F3F2] dark:hover:bg-[#202222] transition"
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#20B2AA]/15 text-[#20B2AA] flex items-center justify-center shrink-0">
                            {getDeviceIcon(session.userAgent)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED] truncate">
                                {parseBrowser(session.userAgent)}
                              </span>
                              {session.isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Current Device</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>IP: {session.ipAddress || '127.0.0.1'}</span>
                              <span>•</span>
                              <span>Signed in {new Date(session.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {!session.isCurrent && (
                          <button
                            onClick={() => revokeSession(session.id)}
                            className="self-end sm:self-center px-3 py-1.5 rounded-xl text-xs font-medium text-[#737878] dark:text-[#9EA3A3] hover:text-rose-600 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  {sessions.length === 0 && !isLoadingSessions && (
                    <div className="text-center py-8 text-[#737878] dark:text-[#9EA3A3] text-sm">
                      No active sessions found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#191A1A] dark:text-[#EDEDED]">
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-[#737878] dark:text-[#9EA3A3] mt-1">
                    Control how and when ComeOver alerts you about messages and calls.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Push Permission Request */}
                  <div className="p-4 rounded-2xl bg-[#20B2AA]/10 border border-[#20B2AA]/20 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Desktop Push Notifications
                      </h3>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-0.5">
                        Permission status:{' '}
                        <span className="font-semibold capitalize text-[#20B2AA]">
                          {notificationPermission}
                        </span>
                      </p>
                    </div>
                    {notificationPermission !== 'granted' ? (
                      <button
                        onClick={handleRequestPushPermission}
                        className="px-3.5 py-1.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black font-semibold text-xs transition shadow-md shadow-[#20B2AA]/20 cursor-pointer active:scale-95"
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
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A]">
                    <div>
                      <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Message Sound Alerts
                      </h4>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                        Play an audible chime when new direct messages arrive
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateNotifPrefs({ messageSounds: !notifPrefs.messageSounds })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                        notifPrefs.messageSounds ? 'bg-[#20B2AA]' : 'bg-[#E5E5E3] dark:bg-[#2D3030]'
                      }`}
                    >
                      <div
                        className={`bg-white dark:bg-[#EDEDED] w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          notifPrefs.messageSounds ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Call Ringtone */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A]">
                    <div>
                      <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Incoming Call Ringtone
                      </h4>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                        Play continuous ringtone during incoming WebRTC voice & video calls
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateNotifPrefs({ callRingtone: !notifPrefs.callRingtone })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                        notifPrefs.callRingtone ? 'bg-[#20B2AA]' : 'bg-[#E5E5E3] dark:bg-[#2D3030]'
                      }`}
                    >
                      <div
                        className={`bg-white dark:bg-[#EDEDED] w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          notifPrefs.callRingtone ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Message Preview */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A]">
                    <div>
                      <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Message Content Previews
                      </h4>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                        Show sender and message snippet in banner notifications
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateNotifPrefs({ messagePreview: !notifPrefs.messagePreview })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                        notifPrefs.messagePreview ? 'bg-[#20B2AA]' : 'bg-[#E5E5E3] dark:bg-[#2D3030]'
                      }`}
                    >
                      <div
                        className={`bg-white dark:bg-[#EDEDED] w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          notifPrefs.messagePreview ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Notification Chime Level with JellyRadio */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A] gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Notification Chime Intensity
                      </h4>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                        Adjust audio volume level and alert haptic resonance
                      </p>
                    </div>
                    <JellyRadio
                      items={['Off', 'Low', 'Medium', 'High', 'Max']}
                      value={alertChimeLevel}
                      onChange={(val) => setAlertChimeLevel(val)}
                      chipColor={theme === 'dark' ? '#202222' : '#F3F3F2'}
                      activeColor="#20B2AA"
                      textColor={theme === 'dark' ? '#9EA3A3' : '#737878'}
                      activeTextColor="#000000"
                      size="sm"
                      gap={6}
                      radius={14}
                      swell={0.16}
                      barge={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. PRIVACY & E2EE TAB */}
            {activeTab === 'privacy' && (
              <div className="bg-white dark:bg-[#141515] rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#191A1A] dark:text-[#EDEDED]">
                    Privacy & End-to-End Encryption
                  </h2>
                  <p className="text-sm text-[#737878] dark:text-[#9EA3A3] mt-1">
                    Manage message read status, online visibility, and cryptographic protections.
                  </p>
                </div>

                {/* E2EE Status Card */}
                <div className="p-5 rounded-2xl bg-[#20B2AA]/10 border border-[#20B2AA]/20 flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-[#20B2AA] text-black flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-[#191A1A] dark:text-[#EDEDED]">
                        End-to-End Encryption Protocol
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-1 leading-relaxed">
                      All 1-on-1 private conversations and media attachments are cryptographically
                      secured via ECDH key exchange and AES-256-GCM. ComeOver servers cannot inspect
                      your private message content.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Read Receipts */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A]">
                    <div>
                      <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Read Receipts
                      </h4>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                        Allow contacts to see when you have opened and read their messages
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updatePrivacyPrefs({ readReceipts: !privacyPrefs.readReceipts })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                        privacyPrefs.readReceipts ? 'bg-[#20B2AA]' : 'bg-[#E5E5E3] dark:bg-[#2D3030]'
                      }`}
                    >
                      <div
                        className={`bg-white dark:bg-[#EDEDED] w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          privacyPrefs.readReceipts ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Online Status */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A]">
                    <div>
                      <h4 className="text-sm font-semibold text-[#191A1A] dark:text-[#EDEDED]">
                        Online Status
                      </h4>
                      <p className="text-xs text-[#737878] dark:text-[#9EA3A3]">
                        Show a green indicator when you are actively using ComeOver
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updatePrivacyPrefs({
                          showOnlineStatus: !privacyPrefs.showOnlineStatus,
                        })
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 cursor-pointer ${
                        privacyPrefs.showOnlineStatus
                          ? 'bg-[#20B2AA]'
                          : 'bg-[#E5E5E3] dark:bg-[#2D3030]'
                      }`}
                    >
                      <div
                        className={`bg-white dark:bg-[#EDEDED] w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                          privacyPrefs.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Navigation Sidebar: Dedicated Account & Platform Controls */}
          <aside className="md:col-span-12 lg:col-span-3 bg-white dark:bg-[#141515] rounded-2xl sm:rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] p-2 sm:p-2.5 shadow-sm overflow-hidden">
            <div className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3]">
              Account Controls
            </div>
            <div className="flex flex-col gap-1.5">
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center space-x-3 px-3.5 py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm transition text-left bg-[#E6F7F6] hover:bg-[#D5F2F0] dark:bg-[#1D2B29] dark:hover:bg-[#233835] text-[#191A1A] dark:text-[#EDEDED] border border-[#B2E5E2] dark:border-[#25423E] shadow-xs group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#20B2AA]/20 text-[#20B2AA] flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold flex items-center space-x-1.5">
                      <span className="truncate">Admin Portal</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#20B2AA]/20 text-[#20B2AA] rounded font-bold shrink-0">
                        SYSTEM
                      </span>
                    </div>
                    <div className="text-xs text-[#737878] dark:text-[#9EA3A3] truncate">
                      Manage users & platform
                    </div>
                  </div>
                </Link>
              )}

              {/* Dedicated Sign Out Option */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm transition text-left text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-500/10 dark:hover:bg-rose-500/15 border border-rose-500/20 dark:border-rose-500/30 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">
                    {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                  </div>
                  <div className="text-xs text-rose-500/70 dark:text-rose-400/70 truncate">
                    Sign out of your account
                  </div>
                </div>
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#191A1A]/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#141515] rounded-3xl border border-rose-500/20 dark:border-rose-500/30 p-5 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#191A1A] dark:text-[#EDEDED]">
                Delete Account Permanently?
              </h3>
              <p className="text-xs text-[#737878] dark:text-[#9EA3A3] mt-1 leading-relaxed">
                This action is irreversible. All your personal profile data, contacts, and active
                sessions will be deactivated immediately.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#737878] dark:text-[#9EA3A3] mb-1 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] text-base sm:text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#737878] dark:text-[#9EA3A3] mb-1 uppercase tracking-wider">
                  Type <span className="font-mono text-rose-600 font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E3] dark:border-[#2D3030] bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] text-base sm:text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none font-mono transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#191A1A] dark:text-[#EDEDED] bg-[#F3F3F2] dark:bg-[#202222] hover:bg-[#E5E5E3] dark:hover:bg-[#262828] border border-[#E5E5E3] dark:border-[#2D3030] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer active:scale-95"
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
