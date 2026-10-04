export interface ContactUser {
  contactId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  statusMessage: string | null;
  lastSeen: string | null;
  connectedAt: string;
}

export interface ContactRequest {
  requestId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  createdAt: string;
}

export interface ContactsResponse {
  contacts: ContactUser[];
}

export interface PendingRequestsResponse {
  incoming: ContactRequest[];
  outgoing: ContactRequest[];
}
