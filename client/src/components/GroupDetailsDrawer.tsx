import { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useContactStore } from '../store/useContactStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  X,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  UserPlus,
  LogOut,
  Hash,
  Globe,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { ChatMemberRole } from '../types/chat';

interface GroupDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupDetailsDrawer({ isOpen, onClose }: GroupDetailsDrawerProps) {
  const { user } = useAuthStore();
  const {
    activeGroupDetails,
    addMembersToGroup,
    removeMemberFromGroup,
    updateMemberRoleInGroup,
    leaveGroup,
  } = useChatStore();
  const { contacts } = useContactStore();

  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);

  if (!isOpen || !activeGroupDetails) return null;

  const isOwner = activeGroupDetails.callerRole === 'owner';
  const isAdmin = isOwner || activeGroupDetails.callerRole === 'admin';
  const isMod = isAdmin || activeGroupDetails.callerRole === 'moderator';

  // Contacts not currently in the group
  const existingUserIds = new Set(activeGroupDetails.members.map((m) => m.userId));
  const availableToAdd = contacts.filter((c) => !existingUserIds.has(c.userId));

  const handleAddSubmit = async () => {
    if (selectedToAdd.length === 0) return;
    await addMembersToGroup(activeGroupDetails.id, selectedToAdd);
    setSelectedToAdd([]);
    setShowAddMember(false);
  };

  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave this conversation?')) {
      await leaveGroup(activeGroupDetails.id);
      onClose();
    }
  };

  const handleKick = async (targetUserId: string, name: string) => {
    if (confirm(`Remove ${name} from the conversation?`)) {
      await removeMemberFromGroup(activeGroupDetails.id, targetUserId);
    }
  };

  const handleRoleChange = async (targetUserId: string, role: 'admin' | 'moderator' | 'member') => {
    await updateMemberRoleInGroup(activeGroupDetails.id, targetUserId, role);
    setActiveMenuMemberId(null);
  };

  const getRoleBadge = (role: ChatMemberRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3" />
            <span>Owner</span>
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>Admin</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
            <UserCheck className="w-3 h-3" />
            <span>Mod</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs sm:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-none sm:relative sm:inset-auto sm:z-auto sm:w-80 md:w-88 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-hidden shadow-2xl transition-all">
        {/* Header */}
        <div className="h-16 px-4 sm:px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {activeGroupDetails.type === 'channel' ? 'Channel Info' : 'Group Details'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

      {/* Body Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 pb-safe">
        {/* Profile Card */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
            {activeGroupDetails.type === 'channel' ? (
              <Hash className="w-8 h-8" />
            ) : (
              activeGroupDetails.name.charAt(0).toUpperCase()
            )}
          </div>
          <h4 className="font-bold text-base text-slate-900 dark:text-white">
            {activeGroupDetails.type === 'channel'
              ? `#${activeGroupDetails.name}`
              : activeGroupDetails.name}
          </h4>
          <div className="mt-1 flex items-center justify-center space-x-2 text-xs text-slate-500">
            {activeGroupDetails.type === 'channel' &&
              (activeGroupDetails.isPublic ? (
                <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public Channel</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private Channel</span>
                </span>
              ))}
            <span>&bull;</span>
            <span>{activeGroupDetails.membersCount} members</span>
          </div>

          {activeGroupDetails.description && (
            <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-left leading-relaxed">
              {activeGroupDetails.description}
            </p>
          )}
        </div>

        {/* Member Management Actions */}
        {isMod && (
          <div className="pt-2">
            {!showAddMember ? (
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Members</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Select from Contacts
                  </p>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                {availableToAdd.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">All your contacts are already in this group.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {availableToAdd.map((contact) => (
                      <label
                        key={contact.userId}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {contact.displayName}
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedToAdd.includes(contact.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedToAdd((prev) => [...prev, contact.userId]);
                            } else {
                              setSelectedToAdd((prev) => prev.filter((id) => id !== contact.userId));
                            }
                          }}
                          className="w-3.5 h-3.5 accent-indigo-600"
                        />
                      </label>
                    ))}
                  </div>
                )}
                {selectedToAdd.length > 0 && (
                  <button
                    onClick={() => void handleAddSubmit()}
                    className="w-full py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs"
                  >
                    Add ({selectedToAdd.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Member Roster */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Members ({activeGroupDetails.members.length})
            </h4>
          </div>

          <div className="space-y-2">
            {activeGroupDetails.members.map((member) => {
              const isCaller = member.userId === user?.id;
              const canModifyRole = isOwner && !isCaller;
              const canKick =
                !isCaller &&
                member.role !== 'owner' &&
                (isOwner || (isAdmin && member.role === 'member'));

              return (
                <div
                  key={member.id}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between space-x-2 relative"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {member.displayName} {isCaller && <span className="text-slate-400 font-normal">(You)</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">@{member.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {getRoleBadge(member.role)}

                    {canModifyRole && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuMemberId(
                              activeMenuMemberId === member.userId ? null : member.userId,
                            )
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {activeMenuMemberId === member.userId && (
                          <div className="absolute right-0 top-6 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-1 z-30 text-xs">
                            <button
                              onClick={() => void handleRoleChange(member.userId, 'admin')}
                              className="w-full text-left px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600"
                            >
                              Make Admin
                            </button>
                            <button
                              onClick={() => void handleRoleChange(member.userId, 'moderator')}
                              className="w-full text-left px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600"
                            >
                              Make Mod
                            </button>
                            <button
                              onClick={() => void handleRoleChange(member.userId, 'member')}
                              className="w-full text-left px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              Make Member
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {canKick && (
                      <button
                        onClick={() => void handleKick(member.userId, member.displayName)}
                        title="Remove member"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Action */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => void handleLeave()}
            className="w-full py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave {activeGroupDetails.type === 'channel' ? 'Channel' : 'Group'}</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
