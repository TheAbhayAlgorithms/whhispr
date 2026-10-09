import { useEffect, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import {
  X,
  Search,
  Hash,
  Users,
  Check,
  Compass,
} from 'lucide-react';

interface ChannelBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChannelBrowserModal({ isOpen, onClose }: ChannelBrowserModalProps) {
  const [search, setSearch] = useState('');
  const { publicChannels, isBrowsingChannels, browsePublicChannels, joinPublicChannel, selectChat } =
    useChatStore();

  useEffect(() => {
    if (isOpen) {
      void browsePublicChannels();
    }
  }, [isOpen, browsePublicChannels]);

  if (!isOpen) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    void browsePublicChannels(val);
  };

  const handleJoinOrOpen = async (channelId: string, isJoined: boolean) => {
    if (isJoined) {
      await selectChat(channelId);
    } else {
      await joinPublicChannel(channelId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] pb-safe animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Discover Public Channels
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore open community discussions and interest groups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition touch-target-44 flex items-center justify-center shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search channels by name or topic..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Channel List: 1 column mobile, 2 columns tablet and desktop */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          {isBrowsingChannels && publicChannels.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Browsing channels...</span>
            </div>
          ) : publicChannels.length === 0 ? (
            <div className="py-12 text-center max-w-xs mx-auto">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Hash className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                No public channels found
              </p>
              <p className="text-xs text-slate-500">
                {search ? `No channels matching "${search}"` : 'Be the first to create one!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {publicChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between space-x-3 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/20 to-violet-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          #{channel.name}
                        </h3>
                        <span className="inline-flex items-center space-x-1 text-[10px] text-slate-400 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 px-1.5 py-0.2 rounded-full shrink-0">
                          <Users className="w-3 h-3" />
                          <span>{channel.memberCount}</span>
                        </span>
                      </div>
                      {channel.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => void handleJoinOrOpen(channel.id, channel.isJoined)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition touch-target-44 sm:min-h-0 sm:min-w-0 ${
                      channel.isJoined
                        ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center space-x-1'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                    }`}
                  >
                    {channel.isJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Open</span>
                      </>
                    ) : (
                      'Join'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
