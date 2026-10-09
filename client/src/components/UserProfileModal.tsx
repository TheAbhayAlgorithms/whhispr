import { PublicProfile } from '../types/profile';
import { X, Clock, Check, Shield } from 'lucide-react';

interface UserProfileModalProps {
  profile: PublicProfile | null;
  onClose: () => void;
}

export function UserProfileModal({ profile, onClose }: UserProfileModalProps) {
  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#141515] border-t sm:border border-[#2C2E2E] rounded-t-3xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-up max-h-[92dvh] sm:max-h-auto overflow-y-auto">
        {/* Banner */}
        <div className="h-24 sm:h-28 bg-gradient-to-r from-[#191A1A] via-[#1D2B29] to-[#191A1A] border-b border-[#2C2E2E] relative shrink-0">
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-[#141515]/70 hover:bg-[#141515] text-[#9EA3A3] hover:text-[#EDEDED] flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Profile Details */}
        <div className="px-5 sm:px-6 pb-6 pt-0 relative pb-safe bg-[#141515]">
          {/* Avatar */}
          <div className="-mt-12 mb-4 flex justify-between items-end">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[#202222] border-4 border-[#141515] flex items-center justify-center text-2xl sm:text-3xl font-bold text-[#20B2AA] shadow-xl shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{profile.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            {profile.isContact ? (
              <span className="px-3 py-1 rounded-full bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] text-xs font-semibold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>In Contacts</span>
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#EDEDED] tracking-tight">{profile.displayName}</h2>
            <p className="text-xs text-[#20B2AA] font-medium">@{profile.username}</p>
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

          {/* Action button */}
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 min-h-[44px] py-3 sm:py-2.5 px-4 rounded-xl bg-[#202222] hover:bg-[#262828] border border-[#2D3030] text-xs font-semibold text-[#EDEDED] transition active:scale-[0.98] cursor-pointer"
            >
              <span>Close Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
