import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { UnauthorizedError } from '../utils/errors';
import {
  SearchMessagesQuery,
  SearchUsersQuery,
  SearchChatsQuery,
  SearchAllQuery,
} from '../validation/search.schema';

export class SearchController {
  static async searchAll(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const query = req.query as unknown as SearchAllQuery;

    const result = await SearchService.searchAll(
      req.user.userId,
      query.q,
      query.limit ? Number(query.limit) : 10,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async searchMessages(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const query = req.query as unknown as SearchMessagesQuery;

    const result = await SearchService.searchMessages(req.user.userId, {
      q: query.q,
      chatId: query.chatId,
      senderId: query.senderId,
      hasMedia: query.hasMedia,
      limit: query.limit ? Number(query.limit) : 20,
      offset: query.offset ? Number(query.offset) : 0,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async searchUsers(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const query = req.query as unknown as SearchUsersQuery;

    const users = await SearchService.searchUsers(
      req.user.userId,
      query.q,
      query.limit ? Number(query.limit) : 20,
    );

    res.status(200).json({
      success: true,
      data: { users },
    });
  }

  static async searchChats(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const query = req.query as unknown as SearchChatsQuery;

    const chats = await SearchService.searchChats(
      req.user.userId,
      query.q,
      query.limit ? Number(query.limit) : 20,
    );

    res.status(200).json({
      success: true,
      data: { chats },
    });
  }
}
