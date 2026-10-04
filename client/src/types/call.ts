export type CallType = 'audio' | 'video';

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';

export interface CallSession {
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  chatId?: string | null;
  callType: CallType;
  status: CallStatus;
  isInitiator: boolean;
  startedAt?: number;
  duration: number;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallHistoryItem {
  id: string;
  chat_id: string | null;
  caller_id: string;
  recipient_id: string;
  type: CallType;
  status: 'missed' | 'completed' | 'rejected' | 'busy' | 'cancelled';
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

export interface IncomingCallPayload {
  callerId: string;
  callerUsername: string;
  callerDisplayName: string;
  callerAvatar: string | null;
  chatId?: string | null;
  callType: CallType;
  offer: RTCSessionDescriptionInit;
}
