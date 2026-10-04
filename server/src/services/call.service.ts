import { query } from '../config/database';
import { CallRecord, CallType, CallStatus, IceServerConfig } from '../types/call.types';
import { BadRequestError } from '../utils/errors';

export interface CreateCallParams {
  chatId?: string | null;
  callerId: string;
  recipientId: string;
  type: CallType;
  status: CallStatus;
  duration?: number;
  startedAt?: Date | string;
  endedAt?: Date | string | null;
}

export class CallService {
  /**
   * Returns list of configured ICE (STUN/TURN) servers for WebRTC peer connection.
   */
  static getIceServers(): IceServerConfig[] {
    const servers: IceServerConfig[] = [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ],
      },
    ];

    if (process.env.TURN_URL) {
      servers.push({
        urls: process.env.TURN_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      });
    }

    return servers;
  }

  /**
   * Logs a voice or video call event into database.
   */
  static async logCall(params: CreateCallParams): Promise<CallRecord> {
    const {
      chatId = null,
      callerId,
      recipientId,
      type,
      status,
      duration = 0,
      startedAt = new Date(),
      endedAt = null,
    } = params;

    if (callerId === recipientId) {
      throw new BadRequestError('Caller and recipient cannot be the same user', 'CANNOT_CALL_SELF');
    }

    const res = await query<CallRecord>(
      `INSERT INTO calls (chat_id, caller_id, recipient_id, type, status, duration, started_at, ended_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, chat_id, caller_id, recipient_id, type, status, duration, started_at, ended_at, created_at`,
      [chatId, callerId, recipientId, type, status, duration, startedAt, endedAt],
    );

    const call = res.rows[0];

    // Fetch caller & recipient basic info
    const usersRes = await query<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    }>(
      `SELECT u.id, u.username, COALESCE(p.display_name, u.username) as display_name, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id IN ($1, $2)`,
      [callerId, recipientId],
    );

    const caller = usersRes.rows.find((u) => u.id === callerId);
    const recipient = usersRes.rows.find((u) => u.id === recipientId);

    return {
      ...call,
      caller: caller || undefined,
      recipient: recipient || undefined,
    };
  }

  /**
   * Retrieves call logs for a user with pagination.
   */
  static async getCallHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ calls: CallRecord[]; total: number }> {
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM calls
       WHERE caller_id = $1::uuid OR recipient_id = $1::uuid`,
      [userId],
    );

    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const res = await query<
      CallRecord & {
        c_username: string;
        c_display_name: string;
        c_avatar_url: string | null;
        r_username: string;
        r_display_name: string;
        r_avatar_url: string | null;
      }
    >(
      `SELECT 
         c.id, c.chat_id, c.caller_id, c.recipient_id, c.type, c.status, c.duration,
         c.started_at, c.ended_at, c.created_at,
         cu.username as c_username, COALESCE(cp.display_name, cu.username) as c_display_name, cp.avatar_url as c_avatar_url,
         ru.username as r_username, COALESCE(rp.display_name, ru.username) as r_display_name, rp.avatar_url as r_avatar_url
       FROM calls c
       JOIN users cu ON cu.id = c.caller_id
       LEFT JOIN profiles cp ON cp.user_id = cu.id
       JOIN users ru ON ru.id = c.recipient_id
       LEFT JOIN profiles rp ON rp.user_id = ru.id
       WHERE c.caller_id = $1::uuid OR c.recipient_id = $1::uuid
       ORDER BY c.started_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const calls: CallRecord[] = res.rows.map((row) => ({
      id: row.id,
      chat_id: row.chat_id,
      caller_id: row.caller_id,
      recipient_id: row.recipient_id,
      type: row.type,
      status: row.status,
      duration: Number(row.duration),
      started_at: row.started_at,
      ended_at: row.ended_at,
      created_at: row.created_at,
      caller: {
        id: row.caller_id,
        username: row.c_username,
        display_name: row.c_display_name,
        avatar_url: row.c_avatar_url,
      },
      recipient: {
        id: row.recipient_id,
        username: row.r_username,
        display_name: row.r_display_name,
        avatar_url: row.r_avatar_url,
      },
    }));

    return { calls, total };
  }
}
