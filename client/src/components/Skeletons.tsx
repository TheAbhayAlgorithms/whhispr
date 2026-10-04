export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1.5 p-2 animate-pulse" role="status" aria-label="Loading conversations">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-2xl flex items-center space-x-3 bg-slate-50/60 dark:bg-slate-850/40 border border-slate-100/50 dark:border-slate-800/40"
        >
          {/* Avatar skeleton */}
          <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />

          {/* Text lines skeleton */}
          <div className="flex-1 space-y-2 py-0.5">
            <div className="flex justify-between items-center">
              <div
                className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md"
                style={{ width: `${40 + (i % 3) * 20}%` }}
              />
              <div className="h-2.5 w-10 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="h-3 bg-slate-200/70 dark:bg-slate-800/60 rounded-md w-3/4" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading conversations...</span>
    </div>
  );
}

export function MessagesSkeleton({ count = 7 }: { count?: number }) {
  const alignments = [false, true, true, false, true, false, true];

  return (
    <div
      className="p-4 sm:p-6 space-y-4 animate-pulse overflow-hidden"
      role="status"
      aria-label="Loading chat messages"
    >
      {Array.from({ length: count }).map((_, i) => {
        const isRight = alignments[i % alignments.length];
        return (
          <div
            key={i}
            className={`flex items-end space-x-2 ${isRight ? 'justify-end' : 'justify-start'}`}
          >
            {!isRight && (
              <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 mb-1" />
            )}

            <div
              className={`rounded-2xl p-3.5 space-y-2 ${
                isRight
                  ? 'bg-indigo-200/50 dark:bg-indigo-900/40 rounded-br-xs'
                  : 'bg-slate-200/60 dark:bg-slate-800/60 rounded-bl-xs'
              }`}
              style={{
                width: `${140 + ((i * 37) % 180)}px`,
                maxWidth: '75%',
              }}
            >
              <div className="h-3 bg-slate-300/60 dark:bg-slate-700/60 rounded-sm w-full" />
              {i % 2 === 0 && (
                <div className="h-3 bg-slate-300/40 dark:bg-slate-700/40 rounded-sm w-2/3" />
              )}
              <div className="h-2 w-12 bg-slate-300/40 dark:bg-slate-700/40 rounded-sm ml-auto mt-1" />
            </div>
          </div>
        );
      })}
      <span className="sr-only">Loading messages...</span>
    </div>
  );
}

export function ContactCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse"
      role="status"
      aria-label="Loading contacts"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-28" />
              <div className="h-2.5 bg-slate-200/70 dark:bg-slate-800/60 rounded-md w-20" />
            </div>
          </div>
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      ))}
      <span className="sr-only">Loading contacts...</span>
    </div>
  );
}
