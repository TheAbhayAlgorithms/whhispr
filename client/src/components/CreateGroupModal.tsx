import { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useContactStore } from '../store/useContactStore';
import {
  X,
  Users,
  Hash,
  Globe,
  Lock,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const [tab, setTab] = useState<'group' | 'channel'>('group');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { createGroup, createChannel } = useChatStore();
  const { contacts } = useContactStore();

  if (!isOpen) return null;

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (tab === 'group') {
        await createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          memberIds: selectedMemberIds,
        });
      } else {
        await createChannel({
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          description: description.trim() || undefined,
          isPublic,
          memberIds: selectedMemberIds,
        });
      }
      onClose();
      setName('');
      setDescription('');
      setSelectedMemberIds([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg bg-[#141515] rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#2C2E2E] shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] pb-safe animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#2C2E2E] flex items-center justify-between shrink-0 bg-[#141515]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] flex items-center justify-center shadow-xs shrink-0">
              {tab === 'group' ? <Users className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#EDEDED]">
                {tab === 'group' ? 'Create a Group Chat' : 'Create a Channel'}
              </h2>
              <p className="text-xs text-[#9EA3A3] line-clamp-1 sm:line-clamp-none">
                {tab === 'group'
                  ? 'Collaborate and message with friends or team members'
                  : 'A space for topic-based discussions and announcements'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222] transition touch-target-44 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-4 sm:px-6 pt-4 flex gap-2 bg-[#141515]">
          <button
            type="button"
            onClick={() => setTab('group')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              tab === 'group'
                ? 'bg-[#1D2B29] border border-[#25423E] text-[#20B2AA]'
                : 'bg-[#202222] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#262828]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Group Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('channel')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${
              tab === 'channel'
                ? 'bg-[#1D2B29] border border-[#25423E] text-[#20B2AA]'
                : 'bg-[#202222] border border-[#2D3030] text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#262828]'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Channel</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-[#141515]">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#EDEDED] mb-1">
              {tab === 'group' ? 'Group Name' : 'Channel Name'}
            </label>
            <div className="relative">
              {tab === 'channel' && (
                <span className="absolute left-3.5 top-2.5 text-[#737878] font-bold text-sm">#</span>
              )}
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tab === 'group' ? 'e.g. Design Sync' : 'general'}
                className={`w-full ${
                  tab === 'channel' ? 'pl-8' : 'pl-3.5'
                } pr-3.5 py-2.5 bg-[#191A1A] border border-[#2C2E2E] rounded-xl text-base sm:text-xs text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] transition`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDEDED] mb-1">
              Description or Topic (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this conversation about?"
              className="w-full px-3.5 py-2.5 bg-[#191A1A] border border-[#2C2E2E] rounded-xl text-base sm:text-xs text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] transition"
            />
          </div>

          {tab === 'channel' && (
            <div className="p-3.5 rounded-xl bg-[#202222] border border-[#2D3030]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-[#20B2AA]" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-400" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-[#EDEDED]">
                      {isPublic ? 'Public Channel' : 'Private Channel'}
                    </p>
                    <p className="text-[11px] text-[#9EA3A3]">
                      {isPublic
                        ? 'Anyone in ComeOver can discover and join this channel'
                        : 'Only invited members can view and join'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-[#20B2AA] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Member Selection from Contacts */}
          <div>
            <label className="block text-xs font-semibold text-[#EDEDED] mb-1.5">
              Add Initial Members from Contacts ({selectedMemberIds.length} selected)
            </label>
            {contacts.length === 0 ? (
              <p className="text-xs text-[#737878] italic">
                You do not have any contacts added yet. You can still create the {tab} and invite
                members later!
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-[#191A1A] rounded-xl border border-[#2C2E2E]">
                {contacts.map((contact) => {
                  const isChecked = selectedMemberIds.includes(contact.userId);
                  return (
                    <div
                      key={contact.userId}
                      onClick={() => toggleMemberSelection(contact.userId)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                        isChecked
                          ? 'bg-[#1D2B29] border border-[#25423E]'
                          : 'hover:bg-[#202222]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#202222] border border-[#2D3030] flex items-center justify-center text-xs font-bold text-[#20B2AA]">
                          {contact.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#EDEDED]">
                            {contact.displayName}
                          </p>
                          <p className="text-[10px] text-[#737878]">@{contact.username}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-[#20B2AA] border-[#20B2AA] text-black font-bold'
                            : 'border-[#2D3030] text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9EA3A3] hover:text-[#EDEDED] hover:bg-[#202222] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-[#20B2AA] hover:bg-[#1CA099] disabled:opacity-40 text-black text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Creating...'
                  : tab === 'group'
                  ? 'Create Group'
                  : 'Create Channel'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
