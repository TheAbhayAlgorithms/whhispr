import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { StorageService } from '../services/storage.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class MediaController {
  /**
   * Handles uploading a media file (image, video, audio, or document).
   */
  static async uploadFile(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new BadRequestError('No file provided for upload', 'FILE_REQUIRED');
    }

    const stored = await StorageService.saveMedia(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );

    res.status(201).json({
      success: true,
      data: stored,
    });
  }

  /**
   * Streams a media file with HTTP Range support for video/audio seeking and image loading.
   */
  static streamFile(req: Request, res: Response): void {
    const { filename } = req.params;
    if (!filename || filename.includes('..')) {
      throw new BadRequestError('Invalid file name', 'INVALID_FILENAME');
    }

    const filePath = StorageService.getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Media file not found', 'FILE_NOT_FOUND');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Detect basic mime type
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/x-m4a',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }

  /**
   * Forces download of a media file with Content-Disposition attachment.
   */
  static downloadFile(req: Request, res: Response): void {
    const { filename } = req.params;
    if (!filename || filename.includes('..')) {
      throw new BadRequestError('Invalid file name', 'INVALID_FILENAME');
    }

    const filePath = StorageService.getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Media file not found', 'FILE_NOT_FOUND');
    }

    res.download(filePath, filename);
  }
}
