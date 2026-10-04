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
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 flex flex-col space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-xs z-20">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-indigo-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inChatQuery}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') toggleInChatSearch(false);
          }}
          placeholder="Search within this conversation..."
          className="flex-1 text-xs bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
        />
        {isInChatSearching ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
        ) : inChatQuery ? (
          <span className="text-[11px] text-slate-500 font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {inChatResults.length} {inChatResults.length === 1 ? 'match' : 'matches'}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => toggleInChatSearch(false)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Close search (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Matching Results Preview List */}
      {inChatQuery.trim() && inChatResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {inChatResults.map((msg) => (
            <div
              key={msg.id}
              onClick={() => onSelectMessage?.(msg.id)}
              className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition cursor-pointer text-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {msg.senderDisplayName}
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 opacity-60" />
                  <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
              <p
                className="text-slate-600 dark:text-slate-300 truncate"
                dangerouslySetInnerHTML={{ __html: msg.headline }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
