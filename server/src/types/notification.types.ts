export type NotificationType =
  | 'new_message'
  | 'contact_request'
  | 'mention'
  | 'call_missed'
  | 'group_invite'
  | 'reaction';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PushSubscriptionParams {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}
