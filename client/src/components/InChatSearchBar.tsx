import { useEffect, useRef } from 'react';
import { useSearchStore } from '../store/useSearchStore';
import { Search, X, Loader2, Calendar } from 'lucide-react';

interface InChatSearchBarProps {
  chatId: string;
  onSelectMessage?: (messageId: string) => void;
}

export function InChatSearchBar({ chatId, onSelectMessage }: InChatSearchBarProps) {
  const {
    inChatQuery,
    setInChatQuery,
    searchInChat,
    inChatResults,
    isInChatSearching,
    toggleInChatSearch,
  } = useSearchStore();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (val: string) => {
    setInChatQuery(val);
    void searchInChat(chatId, val);
  };

  return (
    <div className="border-b border-[#2C2E2E] bg-[#141515] backdrop-blur-md px-4 py-2.5 flex flex-col space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-xs z-20">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-[#20B2AA] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inChatQuery}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') toggleInChatSearch(false);
          }}
          placeholder="Search within this conversation..."
          className="flex-1 text-base sm:text-xs bg-transparent border-none text-[#EDEDED] placeholder-[#737878] focus:outline-none"
        />
        {isInChatSearching ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#20B2AA] shrink-0" />
        ) : inChatQuery ? (
          <span className="text-[11px] text-[#9EA3A3] font-medium px-2 py-0.5 rounded-full bg-[#202222] border border-[#2D3030]">
            {inChatResults.length} {inChatResults.length === 1 ? 'match' : 'matches'}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => toggleInChatSearch(false)}
          className="p-1 text-[#9EA3A3] hover:text-[#EDEDED] rounded-lg hover:bg-[#202222] transition cursor-pointer"
          title="Close search (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Matching Results Preview List */}
      {inChatQuery.trim() && inChatResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1 border-t border-[#2C2E2E]">
          {inChatResults.map((msg) => (
            <div
              key={msg.id}
              onClick={() => onSelectMessage?.(msg.id)}
              className="p-2 rounded-xl bg-[#202222] border border-[#2D3030] hover:bg-[#262828] hover:border-[#20B2AA]/40 transition cursor-pointer text-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-[#737878] mb-0.5">
                <span className="font-semibold text-[#EDEDED]">
                  {msg.senderDisplayName}
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 opacity-60" />
                  <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
              <p
                className="text-[#9EA3A3] truncate [&>mark]:bg-[#20B2AA]/20 [&>mark]:text-[#20B2AA] [&>mark]:px-1 [&>mark]:rounded-sm"
                dangerouslySetInnerHTML={{ __html: msg.headline }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
