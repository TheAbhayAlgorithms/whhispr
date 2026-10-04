export type NotificationType =
  | 'new_message'
  | 'contact_request'
  | 'mention'
  | 'call_missed'
  | 'group_invite'
  | 'reaction';

export interface NotificationItem {
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
