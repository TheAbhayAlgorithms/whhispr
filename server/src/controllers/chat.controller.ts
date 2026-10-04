import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { MessageService } from '../services/message.service';
import { UnauthorizedError } from '../utils/errors';
import { CreateDirectChatInput, SendMessageInput, GetMessagesQuery } from '../validation/chat.schema';

export class ChatController {
  static async getUserChats(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const chats = await ChatService.getUserChats(req.user.userId);

    res.status(200).json({
      success: true,
      data: { chats },
    });
  }

  static async createDirectChat(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { targetUserId } = req.body as CreateDirectChatInput;
    const chat = await ChatService.getOrCreateDirectChat(req.user.userId, targetUserId);

    res.status(200).json({
      success: true,
      data: { chat },
    });
  }

  static async getChatMessages(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { chatId } = req.params;
    const query = req.query as unknown as GetMessagesQuery;

    const { messages, nextCursor } = await MessageService.getChatMessages(
      chatId,
      req.user.userId,
      query.cursor,
      query.limit ? Number(query.limit) : 50,
    );

    res.status(200).json({
      success: true,
      data: { messages, nextCursor },
    });
  }

  static async sendMessage(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { chatId } = req.params;
    const { content, replyToId, attachments, type } = req.body as SendMessageInput;

    const message = await MessageService.sendMessage(
      req.user.userId,
      chatId,
      content,
      replyToId,
      attachments,
      type,
    );

    res.status(201).json({
      success: true,
      data: { message },
    });
  }

  static async markAsRead(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { chatId } = req.params;

    const result = await MessageService.markChatAsRead(req.user.userId, chatId);

    res.status(200).json({
      success: true,
      data: {
        chatId,
        affectedCount: result.affectedCount,
        readMessageIds: result.readMessageIds,
      },
    });
  }

  static async toggleReaction(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { messageId } = req.params;
    const { emoji } = req.body as { emoji: string };

    const result = await MessageService.toggleReaction(req.user.userId, messageId, emoji);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async editMessage(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { messageId } = req.params;
    const { content } = req.body as { content: string };

    const message = await MessageService.editMessage(req.user.userId, messageId, content);

    res.status(200).json({
      success: true,
      data: { message },
    });
  }

  static async deleteMessage(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { messageId } = req.params;
    const body = req.body as { mode?: 'me' | 'everyone' } | undefined;
    const queryParams = req.query as { mode?: 'me' | 'everyone' } | undefined;
    const mode = body?.mode || queryParams?.mode || 'everyone';

    const result = await MessageService.deleteMessage(req.user.userId, messageId, mode);

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

