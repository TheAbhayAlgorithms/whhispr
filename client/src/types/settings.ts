export interface ActiveSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface NotificationPreferences {
  messageSounds: boolean;
  callRingtone: boolean;
  messagePreview: boolean;
  desktopNotifications: boolean;
}

export interface PrivacyPreferences {
  readReceipts: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
}
