export interface FullProfile {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  statusMessage: string | null;
  lastSeen: string | null;
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  avatarVisibility: 'everyone' | 'contacts' | 'nobody';
  addMePolicy: 'everyone' | 'contacts' | 'nobody';
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  statusMessage: string | null;
  lastSeen: string | null;
  isContact: boolean;
  canAdd: boolean;
}

export interface UpdateProfileInput {
  username?: string;
  displayName?: string;
  bio?: string | null;
  statusMessage?: string | null;
  lastSeenVisibility?: 'everyone' | 'contacts' | 'nobody';
  avatarVisibility?: 'everyone' | 'contacts' | 'nobody';
  addMePolicy?: 'everyone' | 'contacts' | 'nobody';
}
