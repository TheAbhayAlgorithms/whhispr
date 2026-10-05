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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              {tab === 'group' ? <Users className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {tab === 'group' ? 'Create a Group Chat' : 'Create a Channel'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tab === 'group'
                  ? 'Collaborate and message with friends or team members'
                  : 'A space for topic-based discussions and announcements'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-4 sm:px-6 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('group')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition ${
              tab === 'group'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Group Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('channel')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition ${
              tab === 'channel'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Channel</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {tab === 'group' ? 'Group Name' : 'Channel Name'}
            </label>
            <div className="relative">
              {tab === 'channel' && (
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">#</span>
              )}
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tab === 'group' ? 'e.g. Design Sync' : 'general'}
                className={`w-full ${
                  tab === 'channel' ? 'pl-8' : 'pl-3.5'
                } pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description or Topic (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this conversation about?"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {tab === 'channel' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  {isPublic ? (
                    <Globe className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-500" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {isPublic ? 'Public Channel' : 'Private Channel'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isPublic
                        ? 'Anyone in Whhispr can discover and join this channel'
                        : 'Only invited members can view and join'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>
            </div>
          )}

          {/* Member Selection from Contacts */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Add Initial Members from Contacts ({selectedMemberIds.length} selected)
            </label>
            {contacts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                You do not have any contacts added yet. You can still create the {tab} and invite
                members later!
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                {contacts.map((contact) => {
                  const isChecked = selectedMemberIds.includes(contact.userId);
                  return (
                    <div
                      key={contact.userId}
                      onClick={() => toggleMemberSelection(contact.userId)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {contact.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {contact.displayName}
                          </p>
                          <p className="text-[10px] text-slate-400">@{contact.username}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 text-transparent'
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
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
