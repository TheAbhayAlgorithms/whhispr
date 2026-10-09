import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';
import {
  ArrowLeft,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  User,
  Shield,
  Eye,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const {
    profile,
    isLoading,
    fetchMyProfile,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  } = useProfileStore();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSeenVisibility, setLastSeenVisibility] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [avatarVisibility, setAvatarVisibility] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [addMePolicy, setAddMePolicy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchMyProfile();
  }, [fetchMyProfile]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setStatusMessage(profile.statusMessage || '');
      setLastSeenVisibility(profile.lastSeenVisibility || 'everyone');
      setAvatarVisibility(profile.avatarVisibility || 'everyone');
      setAddMePolicy(profile.addMePolicy || 'everyone');
    } else if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [profile, user]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar image size must be less than 5 MB.');
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    try {
      await uploadAvatar(file);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo';
      setError(msg);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    setUploadingAvatar(true);
    setError(null);
    try {
      await removeAvatar();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove photo';
      setError(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        statusMessage: statusMessage.trim() || null,
        lastSeenVisibility,
        avatarVisibility,
        addMePolicy,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-[#E5E5E3] dark:border-[#2C2E2E] bg-white/80 dark:bg-[#141515]/80 backdrop-blur-md sticky top-0 z-50 pt-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F3F3F2] dark:bg-[#202222] hover:bg-[#ECECEB] dark:hover:bg-[#262828] border border-[#E5E5E3] dark:border-[#2D3030] flex items-center justify-center text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] transition active:scale-95"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <h1 className="text-base sm:text-lg font-bold text-[#191A1A] dark:text-[#EDEDED] tracking-tight">
              Edit Profile
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />

            {saveSuccess && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved!</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-600 dark:text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
          {/* Avatar Section */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#141515] border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-4 sm:mb-6 flex items-center space-x-2">
              <User className="w-4 h-4 text-[#20B2AA]" />
              <span>Profile Photo</span>
            </h2>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[#E6F7F6] dark:bg-[#202222] border-2 border-[#20B2AA]/40 flex items-center justify-center text-2xl font-bold text-[#20B2AA] shadow-xs">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{displayName ? displayName.charAt(0).toUpperCase() : 'U'}</span>
                  )}
                </div>

                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-[#20B2AA] border-t-transparent animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2 items-center sm:items-start">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarSelect}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-xs font-semibold text-black shadow-md shadow-[#20B2AA]/20 transition disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-black" />
                    <span>Upload New Photo</span>
                  </button>

                  {profile?.avatarUrl && (
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={handleRemoveAvatar}
                      className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#F3F3F2] hover:bg-rose-50 hover:text-rose-600 dark:bg-[#202222] dark:hover:bg-rose-500/10 dark:hover:text-rose-400 border border-[#E5E5E3] dark:border-[#2D3030] text-xs font-medium text-[#737878] dark:text-[#9EA3A3] transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#737878] dark:text-[#9EA3A3] text-center sm:text-left">
                  Recommended: Square JPG, PNG, or WebP. Maximum size: 5 MB.
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#141515] border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-2 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#20B2AA]" />
              <span>Personal Information</span>
            </h2>

            <div>
              <label
                htmlFor="displayName"
                className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-1.5"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="Your full name or alias"
                className="block w-full px-3.5 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] text-base sm:text-sm transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="statusMessage"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3]"
                >
                  Status Message
                </label>
                <span className="text-[11px] text-[#737878] dark:text-[#9EA3A3]">{statusMessage.length}/140</span>
              </div>
              <input
                id="statusMessage"
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                maxLength={140}
                placeholder="What's on your mind? (e.g., Coding 💻, In a meeting 📵)"
                className="block w-full px-3.5 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] text-base sm:text-sm transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="bio"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3]"
                >
                  About / Bio
                </label>
                <span className="text-[11px] text-[#737878] dark:text-[#9EA3A3]">{bio.length}/500</span>
              </div>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                placeholder="Share a short bio about what you do or your interests..."
                className="block w-full px-3.5 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] text-base sm:text-sm transition resize-none"
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-[#141515] border border-[#E5E5E3] dark:border-[#2C2E2E] shadow-xs space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-2 flex items-center space-x-2">
              <Eye className="w-4 h-4 text-[#20B2AA]" />
              <span>Privacy & Visibility</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="lastSeenVisibility"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-1.5"
                >
                  Last Seen
                </label>
                <select
                  id="lastSeenVisibility"
                  value={lastSeenVisibility}
                  onChange={(e) =>
                    setLastSeenVisibility(e.target.value as 'everyone' | 'contacts' | 'nobody')
                  }
                  className="block w-full px-3 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] focus:outline-none focus:border-[#20B2AA] text-base sm:text-sm"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="avatarVisibility"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-1.5"
                >
                  Profile Photo
                </label>
                <select
                  id="avatarVisibility"
                  value={avatarVisibility}
                  onChange={(e) =>
                    setAvatarVisibility(e.target.value as 'everyone' | 'contacts' | 'nobody')
                  }
                  className="block w-full px-3 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] focus:outline-none focus:border-[#20B2AA] text-base sm:text-sm"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-1">
                <label
                  htmlFor="addMePolicy"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-1.5"
                >
                  Who Can Add Me
                </label>
                <select
                  id="addMePolicy"
                  value={addMePolicy}
                  onChange={(e) =>
                    setAddMePolicy(e.target.value as 'everyone' | 'contacts' | 'nobody')
                  }
                  className="block w-full px-3 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] focus:outline-none focus:border-[#20B2AA] text-base sm:text-sm"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Friends of Friends</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl bg-[#20B2AA] hover:bg-[#1CA099] text-sm font-semibold text-black shadow-md shadow-[#20B2AA]/20 transition disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {saving ? (
                <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 text-black" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
