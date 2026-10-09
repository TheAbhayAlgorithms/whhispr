export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1.5 p-2 animate-pulse" role="status" aria-label="Loading conversations">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-xl flex items-center space-x-3 bg-[#202222] border border-[#2D3030]"
        >
          {/* Avatar skeleton */}
          <div className="w-10 h-10 rounded-full bg-[#2C2E2E] shrink-0" />

          {/* Text lines skeleton */}
          <div className="flex-1 space-y-2 py-0.5">
            <div className="flex justify-between items-center">
              <div
                className="h-3.5 bg-[#2C2E2E] rounded-md"
                style={{ width: `${40 + (i % 3) * 20}%` }}
              />
              <div className="h-2.5 w-10 bg-[#2C2E2E] rounded-md" />
            </div>
            <div className="h-3 bg-[#2C2E2E]/60 rounded-md w-3/4" />
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
      className="p-4 sm:p-6 space-y-4 animate-pulse overflow-hidden bg-[#191A1A]"
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
              <div className="w-7 h-7 rounded-full bg-[#2C2E2E] shrink-0 mb-1" />
            )}

            <div
              className={`rounded-2xl p-3.5 space-y-2 ${
                isRight
                  ? 'bg-[#1D2B29] border border-[#25423E] rounded-br-xs'
                  : 'bg-[#202222] border border-[#2D3030] rounded-bl-xs'
              }`}
              style={{
                width: `${140 + ((i * 37) % 180)}px`,
                maxWidth: '75%',
              }}
            >
              <div className="h-3 bg-[#2C2E2E] rounded-sm w-full" />
              {i % 2 === 0 && (
                <div className="h-3 bg-[#2C2E2E]/60 rounded-sm w-2/3" />
              )}
              <div className="h-2 w-12 bg-[#2C2E2E]/40 rounded-sm ml-auto mt-1" />
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
          className="p-4 rounded-xl bg-[#202222] border border-[#2D3030] flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-[#2C2E2E] shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 bg-[#2C2E2E] rounded-md w-28" />
              <div className="h-2.5 bg-[#2C2E2E]/60 rounded-md w-20" />
            </div>
          </div>
          <div className="h-8 w-16 bg-[#2C2E2E] rounded-lg" />
        </div>
      ))}
      <span className="sr-only">Loading contacts...</span>
    </div>
  );
}
