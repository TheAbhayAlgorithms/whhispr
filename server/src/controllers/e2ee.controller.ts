import { Request, Response } from 'express';
import { E2eeService } from '../services/e2ee.service';
import { UnauthorizedError } from '../utils/errors';
import { RegisterKeysInput, ReplenishKeysInput } from '../validation/e2ee.schema';

export class E2eeController {
  /**
   * Upload user's Identity Key, Signed Prekey, and OTPKs.
   */
  static async registerKeys(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as RegisterKeysInput;

    await E2eeService.registerKeys({
      userId: req.user.userId,
      registrationId: body.registrationId,
      identityKey: body.identityKey,
      signedPrekey: body.signedPrekey,
      oneTimePrekeys: body.oneTimePrekeys,
    });

    res.status(201).json({
      success: true,
      message: 'E2EE keys registered successfully',
    });
  }

  /**
   * Fetch Prekey Bundle for a user to establish an X3DH session.
   */
  static async getBundle(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const { userId } = req.params;

    const bundle = await E2eeService.getPrekeyBundle(userId);

    res.status(200).json({
      success: true,
      data: bundle,
    });
  }

  /**
   * Get count of remaining unused one-time prekeys for authenticated user.
   */
  static async getUnusedCount(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');

    const count = await E2eeService.getUnusedPrekeysCount(req.user.userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  }

  /**
   * Replenish one-time prekeys pool.
   */
  static async replenishKeys(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new UnauthorizedError('Unauthorized');
    const body = req.body as ReplenishKeysInput;

    const result = await E2eeService.replenishOneTimePrekeys(req.user.userId, body.keys);

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}
