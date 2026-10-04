import { Request, Response } from 'express';
import { CallService } from '../services/call.service';
import { UnauthorizedError } from '../utils/errors';
import { LogCallInput, CallHistoryQueryInput } from '../validation/call.schema';

export class CallController {
  /**
   * Returns WebRTC ICE servers configuration (STUN/TURN).
   */
  static getIceServers(_req: Request, res: Response): void {
    const iceServers = CallService.getIceServers();
    res.status(200).json({
      success: true,
      data: { iceServers },
    });
  }

  /**
   * Records a completed/missed/rejected call in database.
   */
  static async logCall(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as LogCallInput;

    const call = await CallService.logCall({
      callerId: req.user.userId,
      recipientId: body.recipientId,
      chatId: body.chatId,
      type: body.type,
      status: body.status,
      duration: body.duration,
      startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
      endedAt: body.endedAt ? new Date(body.endedAt) : undefined,
    });

    res.status(201).json({
      success: true,
      data: call,
    });
  }

  /**
   * Returns call history for the authenticated user.
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const query = req.query as unknown as CallHistoryQueryInput;

    const limit = query.limit ? Number(query.limit) : 50;
    const offset = query.offset ? Number(query.offset) : 0;

    const result = await CallService.getCallHistory(req.user.userId, limit, offset);

    res.status(200).json({
      success: true,
      data: {
        calls: result.calls,
        total: result.total,
        limit,
        offset,
      },
    });
  }
}
