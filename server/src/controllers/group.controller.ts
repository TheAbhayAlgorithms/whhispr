import { Request, Response } from 'express';
import { GroupService } from '../services/group.service';
import { UnauthorizedError } from '../utils/errors';
import {
  CreateGroupInput,
  CreateChannelInput,
  UpdateGroupInput,
  AddMembersInput,
  ChangeMemberRoleInput,
} from '../validation/group.schema';

export class GroupController {
  static async createGroup(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as CreateGroupInput;
    const details = await GroupService.createGroup(req.user.userId, body);
    res.status(201).json({
      success: true,
      data: details,
    });
  }

  static async createChannel(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as CreateChannelInput;
    const details = await GroupService.createChannel(req.user.userId, body);
    res.status(201).json({
      success: true,
      data: details,
    });
  }

  static async getChatDetails(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const details = await GroupService.getChatDetails(req.params.chatId, req.user.userId);
    res.status(200).json({
      success: true,
      data: details,
    });
  }

  static async updateChat(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as UpdateGroupInput;
    const details = await GroupService.updateChat(req.params.chatId, req.user.userId, body);
    res.status(200).json({
      success: true,
      data: details,
    });
  }

  static async addMembers(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as AddMembersInput;
    const details = await GroupService.addMembers(
      req.params.chatId,
      req.user.userId,
      body.memberIds,
    );
    res.status(200).json({
      success: true,
      data: details,
    });
  }

  static async removeMember(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const details = await GroupService.removeMember(
      req.params.chatId,
      req.user.userId,
      req.params.targetUserId,
    );
    res.status(200).json({
      success: true,
      data: details,
    });
  }

  static async leaveChat(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const result = await GroupService.leaveChat(req.params.chatId, req.user.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async updateMemberRole(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as ChangeMemberRoleInput;
    const details = await GroupService.updateMemberRole(
      req.params.chatId,
      req.user.userId,
      req.params.targetUserId,
      body.role,
    );
    res.status(200).json({
      success: true,
      data: details,
    });
  }

  static async browsePublicChannels(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const channels = await GroupService.browsePublicChannels(req.user.userId, q, limit);
    res.status(200).json({
      success: true,
      data: channels,
    });
  }

  static async joinPublicChannel(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const details = await GroupService.joinPublicChannel(req.params.chatId, req.user.userId);
    res.status(200).json({
      success: true,
      data: details,
    });
  }
}
