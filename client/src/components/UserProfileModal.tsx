import { PublicProfile } from '../types/profile';
import { X, Clock, Check, Shield } from 'lucide-react';

interface UserProfileModalProps {
  profile: PublicProfile | null;
  onClose: () => void;
}

export function UserProfileModal({ profile, onClose }: UserProfileModalProps) {
  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-up max-h-[92dvh] sm:max-h-auto overflow-y-auto">
        {/* Banner */}
        <div className="h-24 sm:h-28 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 relative shrink-0">
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-slate-950/50 hover:bg-slate-950/80 text-slate-200 flex items-center justify-center transition active:scale-95"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Profile Details */}
        <div className="px-5 sm:px-6 pb-6 pt-0 relative pb-safe">
          {/* Avatar */}
          <div className="-mt-12 mb-4 flex justify-between items-end">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-800 border-4 border-slate-900 flex items-center justify-center text-2xl sm:text-3xl font-bold text-indigo-300 shadow-xl shrink-0">
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
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>In Contacts</span>
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{profile.displayName}</h2>
            <p className="text-xs text-indigo-400 font-medium">@{profile.username}</p>
          </div>

          {/* Status Message */}
          {profile.statusMessage && (
            <div className="mt-4 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-300 flex items-center space-x-2">
              <span className="text-indigo-400 text-sm">💬</span>
              <span>{profile.statusMessage}</span>
            </div>
          )}

          {/* Bio */}
          <div className="mt-4">
            <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>About</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
              {profile.bio || 'No bio provided yet.'}
            </p>
          </div>

          {/* Last Seen */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last Seen</span>
            </span>
            <span className="text-slate-300 font-medium">
              {profile.lastSeen ? new Date(profile.lastSeen).toLocaleDateString() : 'Hidden'}
            </span>
          </div>

          {/* Action button */}
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 min-h-[44px] py-3 sm:py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition active:scale-[0.98]"
            >
              <span>Close Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
