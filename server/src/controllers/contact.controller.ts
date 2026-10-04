import { Request, Response } from 'express';
import { ContactService } from '../services/contact.service';
import { UnauthorizedError } from '../utils/errors';
import { SendContactRequestInput, RespondContactRequestInput } from '../validation/contact.schema';

export class ContactController {
  static async getContacts(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const contacts = await ContactService.getContacts(req.user.userId);

    res.status(200).json({
      success: true,
      data: { contacts },
    });
  }

  static async getPendingRequests(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { incoming, outgoing } = await ContactService.getPendingRequests(req.user.userId);

    res.status(200).json({
      success: true,
      data: { incoming, outgoing },
    });
  }

  static async sendRequest(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const input = req.body as SendContactRequestInput;
    const result = await ContactService.sendRequest(req.user.userId, input);

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  static async respondToRequest(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { requestId } = req.params;
    const { action } = req.body as RespondContactRequestInput;

    const result = await ContactService.respondToRequest(req.user.userId, requestId, action);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  static async removeContact(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { targetUserId } = req.params;

    await ContactService.removeContact(req.user.userId, targetUserId);

    res.status(200).json({
      success: true,
      message: 'Contact removed successfully',
    });
  }
}
