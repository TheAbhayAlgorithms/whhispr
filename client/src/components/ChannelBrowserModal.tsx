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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-2xl bg-[#141515] rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#2C2E2E] shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] pb-safe animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#2C2E2E] flex items-center justify-between shrink-0 bg-[#141515]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] flex items-center justify-center shadow-xs shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#EDEDED]">
                Discover Public Channels
              </h2>
              <p className="text-xs text-[#9EA3A3]">
                Explore open community discussions and interest groups
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

        {/* Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-[#2C2E2E] shrink-0 bg-[#141515]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#737878] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search channels by name or topic..."
              className="w-full pl-10 pr-4 py-2 bg-[#191A1A] border border-[#2C2E2E] rounded-xl text-base sm:text-xs text-[#EDEDED] placeholder-[#737878] focus:outline-none focus:border-[#20B2AA] transition"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-[#141515]">
          {isBrowsingChannels && publicChannels.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#9EA3A3]">
              <div className="w-5 h-5 border-2 border-[#20B2AA] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Browsing channels...</span>
            </div>
          ) : publicChannels.length === 0 ? (
            <div className="py-12 text-center max-w-xs mx-auto">
              <div className="w-10 h-10 rounded-xl bg-[#202222] text-[#737878] flex items-center justify-center mx-auto mb-2">
                <Hash className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[#EDEDED] mb-1">
                No public channels found
              </p>
              <p className="text-xs text-[#737878]">
                {search ? `No channels matching "${search}"` : 'Be the first to create one!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {publicChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between space-x-3 p-3 rounded-xl border border-[#2D3030] bg-[#202222] hover:bg-[#262828] hover:border-[#20B2AA]/40 transition"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#1D2B29] border border-[#25423E] text-[#20B2AA] flex items-center justify-center font-bold shrink-0">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-semibold text-xs text-[#EDEDED] truncate">
                          #{channel.name}
                        </h3>
                        <span className="inline-flex items-center space-x-1 text-[10px] text-[#9EA3A3] bg-[#191A1A] border border-[#2D3030] px-1.5 py-0.2 rounded-full shrink-0">
                          <Users className="w-3 h-3" />
                          <span>{channel.memberCount}</span>
                        </span>
                      </div>
                      {channel.description && (
                        <p className="text-[11px] text-[#737878] truncate mt-0.5">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => void handleJoinOrOpen(channel.id, channel.isJoined)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer touch-target-44 sm:min-h-0 sm:min-w-0 ${
                      channel.isJoined
                        ? 'bg-[#262828] border border-[#2D3030] text-[#EDEDED] hover:bg-[#2C2E2E] flex items-center space-x-1'
                        : 'bg-[#20B2AA] hover:bg-[#1CA099] text-black font-semibold'
                    }`}
                  >
                    {channel.isJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#20B2AA]" />
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
