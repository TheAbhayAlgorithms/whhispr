export type CallType = 'audio' | 'video';

export type CallStatus = 'missed' | 'completed' | 'rejected' | 'busy' | 'cancelled';

export interface CallRecord {
  id: string;
  chat_id: string | null;
  caller_id: string;
  recipient_id: string;
  type: CallType;
  status: CallStatus;
  duration: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  caller?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  recipient?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}
