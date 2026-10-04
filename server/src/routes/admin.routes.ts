import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { AdminService } from '../services/admin.service';

const router = Router();

// Protect all admin routes with authentication and require admin role
router.use(authenticate, requireRole('admin'));

// GET /api/v1/admin/overview
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await AdminService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/users
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await AdminService.getAllUsers();
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/users/:userId/status
router.patch('/users/:userId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const currentAdminId = req.user!.userId;

    const result = await AdminService.updateUserStatus(userId, Boolean(isActive), currentAdminId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/users/:userId/role
router.patch('/users/:userId/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const currentAdminId = req.user!.userId;

    if (role !== 'user' && role !== 'admin') {
      res.status(400).json({ success: false, error: { message: 'Invalid role' } });
      return;
    }

    const result = await AdminService.updateUserRole(userId, role, currentAdminId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/messages
router.get('/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    const messages = await AdminService.getAllMessages(limit);
    res.json({ success: true, data: { messages } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/messages/:messageId
router.delete('/messages/:messageId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    await AdminService.deleteMessage(messageId);
    res.json({ success: true, message: 'Message removed by administrator' });
  } catch (err) {
    next(err);
  }
});

export default router;
