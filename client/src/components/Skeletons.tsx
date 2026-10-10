import { DevicesLoading } from './DevicesLoading';

export function ChatListSkeleton(_props?: { count?: number }) {
  return (
    <div
      className="py-12 px-4 flex flex-col items-center justify-center space-y-3 animate-fade-in"
      role="status"
      aria-label="Loading conversations"
    >
      <DevicesLoading size="sm" label="Connecting devices..." />
      <span className="sr-only">Loading conversations...</span>
    </div>
  );
}

export function MessagesSkeleton(_props?: { count?: number }) {
  return (
    <div
      className="h-full min-h-[280px] flex flex-col items-center justify-center p-8 space-y-4 bg-[#191A1A] animate-fade-in"
      role="status"
      aria-label="Loading chat messages"
    >
      <DevicesLoading size="md" label="Loading encrypted messages..." />
      <span className="sr-only">Loading messages...</span>
    </div>
  );
}

export function UserSearchSkeleton(_props?: { count?: number }) {
  return (
    <div
      className="py-10 px-4 flex flex-col items-center justify-center space-y-3 animate-fade-in"
      role="status"
      aria-label="Searching users"
    >
      <DevicesLoading size="sm" label="Searching users across devices..." />
    </div>
  );
}

export function ContactCardsSkeleton(_props?: { count?: number }) {
  return (
    <div
      className="py-16 px-4 flex flex-col items-center justify-center space-y-3 animate-fade-in"
      role="status"
      aria-label="Loading contacts"
    >
      <DevicesLoading size="md" label="Loading contacts across devices..." />
      <span className="sr-only">Loading contacts...</span>
    </div>
  );
}
