import React, { useState, useRef, useEffect } from 'react';
import { PublicProfile } from '../types/profile';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';
import { useContactStore } from '../store/useContactStore';
import {
  X,
  Clock,
  Check,
  Shield,
  Pencil,
  Loader2,
  Trash2,
  Phone,
  Video,
  MessageSquare,
  AlertCircle,
  Save,
  UserPlus,
  UserCheck,
  UserX,
  Info,
} from 'lucide-react';

interface UserProfileModalProps {
  profile: PublicProfile | null;
  onClose: () => void;
  onStartCall?: (params: {
    recipientId: string;
    recipientName: string;
    recipientAvatar: string | null;
    callType: 'audio' | 'video';
  }) => void;
  onOpenChat?: (userId: string) => void;
}

export function UserProfileModal({
  profile,
  onClose,
  onStartCall,
  onOpenChat,
}: UserProfileModalProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { updateProfile, uploadAvatar, removeAvatar } = useProfileStore();
  const {
    contacts,
    incomingRequests,
    outgoingRequests,
    sendContactRequest,
    respondToRequest,
  } = useContactStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSelf = Boolean(
    currentUser && profile && (profile.userId === currentUser.id || profile.username === currentUser.username),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDp, setIsUploadingDp] = useState(false);
  const [isContactActionLoading, setIsContactActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAcceptedContact = Boolean(
    profile?.isContact || (profile && contacts.some((c) => c.userId === profile.userId))
  );

  const outgoingReq =
    (profile && outgoingRequests.find((r) => r.userId === profile.userId)) ||
    (profile?.contactStatus === 'pending_sent'
      ? { requestId: profile.contactRequestId || '' }
      : null);

  const incomingReq =
    (profile && incomingRequests.find((r) => r.userId === profile.userId)) ||
    (profile?.contactStatus === 'pending_received'
      ? { requestId: profile.contactRequestId || '' }
      : null);

  const isPendingSent = !isAcceptedContact && Boolean(outgoingReq);
  const isPendingReceived = !isAcceptedContact && Boolean(incomingReq);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setStatusMessage(profile.statusMessage || '');
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsEditing(false);
    }
  }, [profile]);

  if (!profile) return null;

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    setErrorMsg(null);
    setIsUploadingDp(true);
    try {
      await uploadAvatar(file);
      setSuccessMsg('Profile picture updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Avatar upload failed';
      setErrorMsg(msg);
    } finally {
      setIsUploadingDp(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setErrorMsg(null);
    setIsUploadingDp(true);
    try {
      await removeAvatar();
      setSuccessMsg('Profile picture removed.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove avatar';
      setErrorMsg(msg);
    } finally {
      setIsUploadingDp(false);
    }
  };

  const handleSendContactReq = async () => {
    if (!profile?.userId) return;
    setIsContactActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await sendContactRequest({ targetUserId: profile.userId });
      setSuccessMsg(res.message || 'Contact request sent successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send contact request';
      setErrorMsg(msg);
    } finally {
      setIsContactActionLoading(false);
    }
  };

  const handleAcceptContactReq = async () => {
    if (!incomingReq?.requestId) return;
    setIsContactActionLoading(true);
    setErrorMsg(null);
    try {
      await respondToRequest(incomingReq.requestId, 'accept');
      setSuccessMsg('Contact request accepted! You can now message and call.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept contact request';
      setErrorMsg(msg);
    } finally {
      setIsContactActionLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      setErrorMsg('Display name must be at least 2 characters');
      return;
    }
    if (username.trim().length < 3) {
      setErrorMsg('Username must be at least 3 characters');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await updateProfile({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim() || null,
        statusMessage: statusMessage.trim() || null,
      });

      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile changes';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceCall = () => {
    if (onStartCall) {
      onStartCall({
        recipientId: profile.userId,
        recipientName: profile.displayName || profile.username,
        recipientAvatar: profile.avatarUrl,
        callType: 'audio',
      });
      onClose();
    }
  };

  const handleVideoCall = () => {
    if (onStartCall) {
      onStartCall({
        recipientId: profile.userId,
        recipientName: profile.displayName || profile.username,
        recipientAvatar: profile.avatarUrl,
        callType: 'video',
      });
      onClose();
    }
  };

  const handleSendMessage = () => {
    if (onOpenChat) {
      onOpenChat(profile.userId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      {/* Hidden file input for DP change */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarSelect}
      />

      <div
        className="bg-[#141515] border-t sm:border border-[#2C2E2E] rounded-t-3xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-up max-h-[92dvh] sm:max-h-auto overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with subtle Perplexity gradient */}
        <div className="h-24 sm:h-28 bg-gradient-to-r from-[#191A1A] via-[#1D2B29] to-[#191A1A] border-b border-[#2C2E2E] relative shrink-0">
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[36px] min-h-[36px] w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#141515]/70 hover:bg-[#141515] border border-[#2C2E2E] text-[#9EA3A3] hover:text-[#EDEDED] flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Details Container */}
        <div className="px-5 sm:px-6 pb-6 pt-0 relative pb-safe bg-[#141515]">
          {/* Avatar and Badges / Pencil Button */}
          <div className="-mt-12 mb-4 flex justify-between items-end">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[#202222] border-4 border-[#141515] flex items-center justify-center text-2xl sm:text-3xl font-bold text-[#20B2AA] shadow-xl shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName || profile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(displayName || profile.displayName || 'U').charAt(0).toUpperCase()}</span>
                )}

                {/* Upload Spinner overlay */}
                {isUploadingDp && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                    <Loader2 className="w-6 h-6 animate-spin text-[#20B2AA]" />
                  </div>
                )}
              </div>

              {/* Pencil Button on DP for current user */}
              {isSelf && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingDp}
                  title="Change profile picture"
                  aria-label="Change profile picture"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#20B2AA] hover:bg-[#1CA099] border-2 border-[#141515] text-black flex items-center justify-center shadow-lg transition transform hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isSelf && profile.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingDp}
                  title="Remove avatar"
                  className="p-2 rounded-xl bg-[#202222] border border-[#2D3030] text-[#9EA3A3] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {!isSelf && (
                <div>
                  {isAcceptedContact ? (
                    <span className="px-3 py-1 rounded-full bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] text-xs font-semibold flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>In Contacts</span>
                    </span>
                  ) : isPendingSent ? (
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Request Pending</span>
                    </span>
                  ) : isPendingReceived ? (
                    <span className="px-3 py-1 rounded-full bg-[#20B2AA]/10 border border-[#20B2AA]/30 text-[#20B2AA] text-xs font-semibold flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Request Received</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-[#202222] border border-[#2D3030] text-[#9EA3A3] text-xs font-semibold flex items-center space-x-1">
                      <UserX className="w-3.5 h-3.5" />
                      <span>Not in Contacts</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] text-xs font-medium flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* EDIT MODE (for self) */}
          {isSelf && isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#EDEDED] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-3.5 py-2 bg-[#191A1A] border border-[#2C2E2E] rounded-xl text-sm text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDEDED] mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-[#737878] text-sm font-medium">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-3.5 py-2 bg-[#191A1A] border border-[#2C2E2E] rounded-xl text-sm text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDEDED] mb-1">
                  Status Message
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs">💬</span>
                  <input
                    type="text"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    placeholder="Set a status message..."
                    className="w-full pl-8 pr-3.5 py-2 bg-[#191A1A] border border-[#2C2E2E] rounded-xl text-sm text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EDEDED] mb-1">
                  About / Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself..."
                  className="w-full px-3.5 py-2 bg-[#191A1A] border border-[#2C2E2E] rounded-xl text-sm text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] transition resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(profile.displayName || '');
                    setUsername(profile.username || '');
                    setBio(profile.bio || '');
                    setStatusMessage(profile.statusMessage || '');
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-xs font-semibold text-[#9EA3A3] hover:text-[#EDEDED] transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* VIEW MODE */
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#EDEDED] tracking-tight">{profile.displayName}</h2>
                  <p className="text-xs text-[#20B2AA] font-medium mt-0.5">@{profile.username}</p>
                </div>

                {isSelf && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-[#20B2AA] text-xs font-semibold transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {/* Status Message */}
              {profile.statusMessage && (
                <div className="mt-4 p-3 rounded-xl bg-[#202222] border border-[#2D3030] text-xs text-[#EDEDED] flex items-center space-x-2">
                  <span className="text-[#20B2AA] text-sm">💬</span>
                  <span>{profile.statusMessage}</span>
                </div>
              )}

              {/* Bio */}
              <div className="mt-4">
                <h3 className="text-xs uppercase font-semibold text-[#737878] tracking-wider mb-1 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#20B2AA]" />
                  <span>About</span>
                </h3>
                <p className="text-xs text-[#9EA3A3] leading-relaxed bg-[#202222] p-3 rounded-xl border border-[#2D3030]">
                  {profile.bio || 'No bio provided yet.'}
                </p>
              </div>

              {/* Last Seen */}
              <div className="mt-4 flex items-center justify-between text-xs text-[#737878] pt-3 border-t border-[#2C2E2E]">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#737878]" />
                  <span>Last Seen</span>
                </span>
                <span className="text-[#EDEDED] font-medium">
                  {profile.lastSeen ? new Date(profile.lastSeen).toLocaleDateString() : 'Hidden'}
                </span>
              </div>

              {/* Actions for PEER: Voice Call, Video Call, and Message */}
              {!isSelf ? (
                <div className="mt-6 space-y-3">
                  {isAcceptedContact ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleVoiceCall}
                          className="flex-1 flex items-center justify-center space-x-2 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-xs font-semibold text-[#20B2AA] hover:text-[#1CA099] transition cursor-pointer"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Voice Call</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleVideoCall}
                          className="flex-1 flex items-center justify-center space-x-2 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-xs font-semibold text-black transition cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Video Call</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        {onOpenChat && (
                          <button
                            type="button"
                            onClick={handleSendMessage}
                            className="flex-1 flex items-center justify-center space-x-2 min-h-[40px] py-2 px-3 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-xs font-semibold text-[#EDEDED] transition cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 text-[#20B2AA]" />
                            <span>Send Message</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 flex items-center justify-center space-x-2 min-h-[40px] py-2 px-3 rounded-xl bg-[#191A1A] hover:bg-[#202222] border border-[#2C2E2E] text-xs font-semibold text-[#9EA3A3] hover:text-[#EDEDED] transition cursor-pointer"
                        >
                          <span>Close</span>
                        </button>
                      </div>
                    </>
                  ) : isPendingSent ? (
                    <>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start space-x-2.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Contact request sent. You will be able to text and call this user once they accept your request.</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled
                          className="flex-1 flex items-center justify-center space-x-2 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#202222] border border-[#2D3030] text-xs font-semibold text-[#737878] opacity-75 cursor-not-allowed"
                        >
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Request Pending Approval</span>
                        </button>

                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 min-h-[44px] py-2.5 rounded-xl bg-[#191A1A] hover:bg-[#202222] border border-[#2C2E2E] text-xs font-semibold text-[#9EA3A3] hover:text-[#EDEDED] transition cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  ) : isPendingReceived ? (
                    <>
                      <div className="p-3 rounded-xl bg-[#1D2B29] border border-[#25423E] text-xs text-[#20B2AA] flex items-start space-x-2.5">
                        <UserCheck className="w-4 h-4 text-[#20B2AA] shrink-0 mt-0.5" />
                        <span>This user sent you a contact request. Accept it below to start texting and calling each other.</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleAcceptContactReq}
                          disabled={isContactActionLoading}
                          className="flex-1 flex items-center justify-center space-x-2 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-xs font-semibold text-black transition shadow-md shadow-[#20B2AA]/20 cursor-pointer disabled:opacity-50"
                        >
                          {isContactActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-black" />
                          )}
                          <span>Accept Contact Request</span>
                        </button>

                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 min-h-[44px] py-2.5 rounded-xl bg-[#191A1A] hover:bg-[#202222] border border-[#2C2E2E] text-xs font-semibold text-[#9EA3A3] hover:text-[#EDEDED] transition cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start space-x-2.5">
                        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>You cannot directly text or call this user without sending a contact request and getting accepted first.</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleSendContactReq}
                          disabled={isContactActionLoading}
                          className="flex-1 flex items-center justify-center space-x-2 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] text-xs font-semibold text-black transition shadow-md shadow-[#20B2AA]/20 cursor-pointer disabled:opacity-50"
                        >
                          {isContactActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <UserPlus className="w-4 h-4 text-black" />
                          )}
                          <span>Send Contact Request</span>
                        </button>

                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 min-h-[44px] py-2.5 rounded-xl bg-[#191A1A] hover:bg-[#202222] border border-[#2C2E2E] text-xs font-semibold text-[#9EA3A3] hover:text-[#EDEDED] transition cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Action for SELF */
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full flex items-center justify-center space-x-2 min-h-[44px] py-3 sm:py-2.5 px-4 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-xs font-semibold text-[#EDEDED] transition active:scale-[0.98] cursor-pointer"
                  >
                    <span>Close Profile</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
