import { Router } from 'express';
import { MediaController } from '../controllers/media.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadMediaMiddleware } from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Upload requires authentication
router.post(
  '/upload',
  authenticate,
  uploadMediaMiddleware.single('file'),
  asyncHandler((req, res) => MediaController.uploadFile(req, res)),
);

// Streaming and downloading files (can be accessed via standard media tags)
router.get('/file/:filename', (req, res) => MediaController.streamFile(req, res));
router.get('/download/:filename', (req, res) => MediaController.downloadFile(req, res));

export default router;
