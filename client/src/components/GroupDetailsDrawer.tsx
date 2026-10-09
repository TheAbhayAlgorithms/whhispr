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
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center space-x-1">
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
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs sm:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-none sm:relative sm:inset-auto sm:z-auto sm:w-80 md:w-88 border-l border-[#2C2E2E] bg-[#141515] flex flex-col shrink-0 overflow-hidden shadow-2xl transition-all">
        {/* Header */}
        <div className="h-16 px-4 sm:px-5 border-b border-[#2C2E2E] flex items-center justify-between shrink-0 bg-[#141515]">
          <h3 className="font-bold text-sm text-[#EDEDED]">
            {activeGroupDetails.type === 'channel' ? 'Channel Info' : 'Group Details'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

      {/* Body Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 pb-safe bg-[#141515]">
        {/* Profile Card */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 bg-[#1D2B29] border border-[#25423E] flex items-center justify-center text-[#20B2AA] font-bold text-xl shadow-md shadow-[#20B2AA]/10">
            {activeGroupDetails.type === 'channel' ? (
              <Hash className="w-8 h-8" />
            ) : (
              activeGroupDetails.name.charAt(0).toUpperCase()
            )}
          </div>
          <h4 className="font-bold text-base text-[#EDEDED]">
            {activeGroupDetails.type === 'channel'
              ? `#${activeGroupDetails.name}`
              : activeGroupDetails.name}
          </h4>
          <div className="mt-1 flex items-center justify-center space-x-2 text-xs text-[#9EA3A3]">
            {activeGroupDetails.type === 'channel' &&
              (activeGroupDetails.isPublic ? (
                <span className="flex items-center space-x-1 text-[#20B2AA]">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public Channel</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private Channel</span>
                </span>
              ))}
            <span>&bull;</span>
            <span>{activeGroupDetails.membersCount} members</span>
          </div>

          {activeGroupDetails.description && (
            <p className="mt-2.5 text-xs text-[#EDEDED] bg-[#202222] p-3 rounded-xl border border-[#2D3030] text-left leading-relaxed">
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
                className="w-full py-2 px-3 rounded-xl bg-[#1D2B29] border border-[#25423E] hover:bg-[#25423E] text-[#20B2AA] text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Members</span>
              </button>
            ) : (
              <div className="p-3 bg-[#202222] rounded-xl border border-[#2D3030] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#EDEDED]">
                    Select from Contacts
                  </p>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="text-xs text-[#9EA3A3] hover:text-[#EDEDED] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                {availableToAdd.length === 0 ? (
                  <p className="text-xs text-[#737878] italic">All your contacts are already in this group.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {availableToAdd.map((contact) => (
                      <label
                        key={contact.userId}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-[#262828] cursor-pointer"
                      >
                        <span className="font-medium text-[#EDEDED] truncate">
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
                          className="w-3.5 h-3.5 accent-[#20B2AA]"
                        />
                      </label>
                    ))}
                  </div>
                )}
                {selectedToAdd.length > 0 && (
                  <button
                    onClick={() => void handleAddSubmit()}
                    className="w-full py-1.5 rounded-lg bg-[#20B2AA] hover:bg-[#1CA099] text-black text-xs font-semibold shadow-xs cursor-pointer"
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#737878]">
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
                  className="p-2.5 rounded-xl bg-[#202222] border border-[#2D3030] flex items-center justify-between space-x-2 relative"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#191A1A] border border-[#2D3030] flex items-center justify-center text-xs font-bold text-[#20B2AA] shrink-0">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#EDEDED] truncate">
                        {member.displayName} {isCaller && <span className="text-[#737878] font-normal">(You)</span>}
                      </p>
                      <p className="text-[10px] text-[#737878] truncate">@{member.username}</p>
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
                          className="p-1 rounded-lg text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#262828] cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {activeMenuMemberId === member.userId && (
                          <div className="absolute right-0 top-6 w-32 bg-[#202222] border border-[#2D3030] shadow-xl rounded-xl p-1 z-30 text-xs">
                            <button
                              onClick={() => void handleRoleChange(member.userId, 'admin')}
                              className="w-full text-left px-2 py-1 rounded-lg hover:bg-[#262828] text-[#20B2AA] cursor-pointer"
                            >
                              Make Admin
                            </button>
                            <button
                              onClick={() => void handleRoleChange(member.userId, 'moderator')}
                              className="w-full text-left px-2 py-1 rounded-lg hover:bg-[#262828] text-[#20B2AA] cursor-pointer"
                            >
                              Make Mod
                            </button>
                            <button
                              onClick={() => void handleRoleChange(member.userId, 'member')}
                              className="w-full text-left px-2 py-1 rounded-lg hover:bg-[#262828] text-[#EDEDED] cursor-pointer"
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
                        className="p-1 rounded-lg text-[#9EA3A3] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
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
        <div className="pt-4 border-t border-[#2C2E2E]">
          <button
            onClick={() => void handleLeave()}
            className="w-full py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
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
