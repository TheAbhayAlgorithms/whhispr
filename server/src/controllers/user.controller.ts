import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { UnauthorizedError, BadRequestError } from '../utils/errors';
import { UpdateProfileInput, SearchUsersQuery } from '../validation/user.schema';

export class UserController {
  static async getMyProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const profile = await UserService.getMyProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data: { profile },
    });
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const input = req.body as UpdateProfileInput;
    const profile = await UserService.updateProfile(req.user.userId, input);

    res.status(200).json({
      success: true,
      data: { profile },
    });
  }

  static async uploadAvatar(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    if (!req.file) {
      throw new BadRequestError('Image file is required for avatar upload', 'FILE_REQUIRED');
    }

    const avatarUrl = await UserService.uploadAvatar(
      req.user.userId,
      req.file.buffer,
      req.file.originalname,
    );

    res.status(200).json({
      success: true,
      data: { avatarUrl },
    });
  }

  static async removeAvatar(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    await UserService.removeAvatar(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Avatar removed successfully',
    });
  }

  static async getPublicProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { id } = req.params;
    const profile = await UserService.getPublicProfile(id, req.user.userId);

    res.status(200).json({
      success: true,
      data: { profile },
    });
  }

  static async searchUsers(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const query = req.query as unknown as SearchUsersQuery;
    const limit = query.limit ?? 20;

    const users = await UserService.searchUsers(query.q, req.user.userId, limit);

    res.status(200).json({
      success: true,
      data: { users },
    });
  }
}
