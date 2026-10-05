import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '../config/env';
import { createRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { socketAuthMiddleware, AuthenticatedSocket } from './auth.socket';
import { PresenceService } from './presence.service';
import { ChatService } from '../services/chat.service';
import { query } from '../config/database';
import { Redis } from 'ioredis';

let io: Server | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export function initSocketIO(httpServer: http.Server): Server {
  io = new Server(httpServer, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Attach Redis adapter for horizontal scaling unless explicitly skipped
  try {
    pubClient = createRedisClient();
    subClient = createRedisClient();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter initialized');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('Failed to initialize Redis adapter for Socket.IO', { error: msg });
  }

  // Socket authentication middleware
  io.use(socketAuthMiddleware);

  // Connection handling
  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;

    logger.info(`User connected via socket: ${user.username} (${user.userId})`, {
      socketId: socket.id,
      userId: user.userId,
    });

    // 1. Join user's individual room for targeted notifications
    await socket.join(`user:${user.userId}`);

    // 2. Mark online in presence service and broadcast to all users
    await PresenceService.setUserOnline(user.userId);
    io?.emit('presence:update', {
      userId: user.userId,
      status: 'online',
    });

    // 3. Immediately send current online users list to this connected client
    const allOnlineIds = await PresenceService.getAllOnlineUsers();
    socket.emit('presence:init', {
      onlineUserIds: allOnlineIds,
    });

    // Acknowledge connection to client with current user ID
    socket.emit('connected', {
      userId: user.userId,
      socketId: socket.id,
    });

    // 3. Heartbeat / ping mechanism
    socket.on('heartbeat', () => {
      socket.emit('heartbeat:ack', { timestamp: Date.now() });
    });

    // 4. Query presence of a contact
    socket.on('presence:query', (targetUserId: string, callback: unknown) => {
      void (async () => {
        if (typeof callback === 'function') {
          const presence = await PresenceService.getUserPresence(targetUserId);
          (callback as (res: unknown) => void)(presence);
        }
      })();
    });

    // Batch query presence
    socket.on('presence:query_batch', (targetUserIds: string[], callback: unknown) => {
      void (async () => {
        if (typeof callback === 'function' && Array.isArray(targetUserIds)) {
          const presences = await PresenceService.getBatchUserPresence(targetUserIds);
          (callback as (res: unknown) => void)(presences);
        }
      })();
    });

    // 5. Join active chat room
    socket.on('chat:join', (chatId: string, callback?: unknown) => {
      void (async () => {
        const isMember = await ChatService.verifyMembership(chatId, user.userId);
        if (isMember) {
          await socket.join(`chat:${chatId}`);
        }
        if (typeof callback === 'function') {
          (callback as (joined: boolean) => void)(isMember);
        }
      })();
    });

    // 6. Leave active chat room
    socket.on('chat:leave', (chatId: string) => {
      void socket.leave(`chat:${chatId}`);
    });

    // 7. Real-time typing indicators
    socket.on('typing:start', async (data: { chatId: string }) => {
      if (!data?.chatId) return;
      const typingPayload = {
        chatId: data.chatId,
        userId: user.userId,
        username: user.username,
        isTyping: true,
      };

      socket.to(`chat:${data.chatId}`).emit('typing:update', typingPayload);

      try {
        const { rows } = await query<{ user_id: string }>(
          `SELECT user_id FROM chat_members WHERE chat_id = $1 AND left_at IS NULL`,
          [data.chatId],
        );
        for (const row of rows) {
          if (row.user_id !== user.userId) {
            io?.to(`user:${row.user_id}`).emit('typing:update', typingPayload);
          }
        }
      } catch {
        // Fallback already delivered to chat room
      }
    });

    socket.on('typing:stop', async (data: { chatId: string }) => {
      if (!data?.chatId) return;
      const typingPayload = {
        chatId: data.chatId,
        userId: user.userId,
        username: user.username,
        isTyping: false,
      };

      socket.to(`chat:${data.chatId}`).emit('typing:update', typingPayload);

      try {
        const { rows } = await query<{ user_id: string }>(
          `SELECT user_id FROM chat_members WHERE chat_id = $1 AND left_at IS NULL`,
          [data.chatId],
        );
        for (const row of rows) {
          if (row.user_id !== user.userId) {
            io?.to(`user:${row.user_id}`).emit('typing:update', typingPayload);
          }
        }
      } catch {
        // Fallback already delivered to chat room
      }
    });

    // 8. Real-time message status updates
    socket.on('message:delivered', (data: { chatId: string; messageIds: string[] }) => {
      void (async () => {
        if (!data?.chatId || !Array.isArray(data?.messageIds) || data.messageIds.length === 0) return;
        try {
          const { MessageService } = await import('../services/message.service');
          await MessageService.markMessagesDelivered(user.userId, data.chatId, data.messageIds);
        } catch (err: unknown) {
          logger.warn('Failed to handle message:delivered socket event', { error: err });
        }
      })();
    });

    socket.on('message:read', (data: { chatId: string }) => {
      void (async () => {
        if (!data?.chatId) return;
        try {
          const { MessageService } = await import('../services/message.service');
          await MessageService.markChatAsRead(user.userId, data.chatId);
        } catch (err: unknown) {
          logger.warn('Failed to handle message:read socket event', { error: err });
        }
      })();
    });

    // 9. WebRTC Voice & Video Call Signaling
    socket.on(
      'call:initiate',
      (
        data: {
          recipientId: string;
          chatId?: string;
          callType: 'audio' | 'video';
          offer: unknown;
          callerDisplayName?: string;
          callerAvatar?: string;
        },
        callback?: (res: { success: boolean; error?: string }) => void,
      ) => {
        if (!data?.recipientId || !data?.offer) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'recipientId and offer are required' });
          }
          return;
        }

        if (data.recipientId === user.userId) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Cannot call yourself' });
          }
          return;
        }

        io?.to(`user:${data.recipientId}`).emit('call:incoming', {
          callerId: user.userId,
          callerUsername: user.username,
          callerDisplayName: data.callerDisplayName || user.username,
          callerAvatar: data.callerAvatar || null,
          chatId: data.chatId || null,
          callType: data.callType || 'audio',
          offer: data.offer,
        });

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      },
    );

    socket.on(
      'call:answer',
      (data: {
        callerId: string;
        answer: unknown;
      }) => {
        if (!data?.callerId || !data?.answer) return;
        io?.to(`user:${data.callerId}`).emit('call:answered', {
          recipientId: user.userId,
          answer: data.answer,
        });
      },
    );

    socket.on(
      'call:ice_candidate',
      (data: {
        targetUserId: string;
        candidate: unknown;
      }) => {
        if (!data?.targetUserId || !data?.candidate) return;
        io?.to(`user:${data.targetUserId}`).emit('call:ice_candidate', {
          senderId: user.userId,
          candidate: data.candidate,
        });
      },
    );

    socket.on(
      'call:reject',
      (data: {
        callerId: string;
        chatId?: string;
        callType?: 'audio' | 'video';
        reason?: string;
      }) => {
        void (async () => {
          if (!data?.callerId) return;

          io?.to(`user:${data.callerId}`).emit('call:rejected', {
            recipientId: user.userId,
            reason: data.reason || 'declined',
          });

          try {
            const { CallService } = await import('../services/call.service');
            await CallService.logCall({
              callerId: data.callerId,
              recipientId: user.userId,
              chatId: data.chatId || null,
              type: data.callType || 'audio',
              status: data.reason === 'busy' ? 'busy' : 'rejected',
              duration: 0,
            });
          } catch (err: unknown) {
            logger.warn('Failed to auto-log rejected call', { error: err });
          }
        })();
      },
    );

    socket.on(
      'call:end',
      (data: {
        targetUserId: string;
        chatId?: string;
        callType?: 'audio' | 'video';
        duration?: number;
      }) => {
        void (async () => {
          if (!data?.targetUserId) return;

          io?.to(`user:${data.targetUserId}`).emit('call:ended', {
            senderId: user.userId,
            duration: data.duration || 0,
          });

          if (data.duration && data.duration > 0) {
            try {
              const { CallService } = await import('../services/call.service');
              await CallService.logCall({
                callerId: user.userId,
                recipientId: data.targetUserId,
                chatId: data.chatId || null,
                type: data.callType || 'audio',
                status: 'completed',
                duration: Math.round(data.duration),
              });
            } catch (err: unknown) {
              logger.warn('Failed to auto-log completed call', { error: err });
            }
          }
        })();
      },
    );

    // 7. Handle disconnection
    socket.on('disconnect', (reason) => {
      void (async () => {
        logger.info(`User disconnected: ${user.username} (${user.userId}), reason: ${reason}`);

        const isNowOffline = await PresenceService.setUserOffline(user.userId);
        if (isNowOffline) {
          io?.emit('presence:update', {
            userId: user.userId,
            status: 'offline',
            lastSeen: new Date().toISOString(),
          });
        }
      })();
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet');
  }
  return io;
}

export async function closeSocketIO(): Promise<void> {
  const currentIo = io;
  if (currentIo) {
    await new Promise<void>((resolve) => {
      void currentIo.close(() => resolve());
    });
    io = null;
  }

  if (pubClient) {
    try {
      await pubClient.quit();
    } catch {
      pubClient.disconnect();
    }
    pubClient = null;
  }

  if (subClient) {
    try {
      await subClient.quit();
    } catch {
      subClient.disconnect();
    }
    subClient = null;
  }
}
