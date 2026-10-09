import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getMediaCategory, MediaCategory } from '../middleware/upload';

export interface StoredMediaResult {
  fileName: string;
  storageKey: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
  type: MediaCategory;
}

export class StorageService {
  private static uploadBaseDir = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);

  private static isServerlessEnvironment(): boolean {
    return (
      Boolean(process.env.VERCEL) ||
      Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
      Boolean(process.env.NOW_REGION) ||
      process.cwd().startsWith('/var/task')
    );
  }

  static init(): void {
    try {
      const avatarDir = path.join(this.uploadBaseDir, 'avatars');
      const mediaDir = path.join(this.uploadBaseDir, 'media');

      if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
      }
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }
    } catch (err: unknown) {
      logger.warn('[StorageService] Local upload directory could not be initialized (serverless/read-only environment)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Saves an avatar image to disk (or base64 Data URI on serverless/read-only runtimes).
   */
  static async saveAvatar(
    fileBuffer: Buffer,
    originalExtension: string,
    mimeType?: string,
  ): Promise<{ filename: string; publicUrl: string }> {
    const cleanExt = originalExtension.startsWith('.')
      ? originalExtension
      : `.${originalExtension}`;
    const filename = `${crypto.randomUUID()}${cleanExt}`;

    const mime =
      mimeType ||
      (cleanExt.toLowerCase() === '.png'
        ? 'image/png'
        : cleanExt.toLowerCase() === '.webp'
        ? 'image/webp'
        : cleanExt.toLowerCase() === '.gif'
        ? 'image/gif'
        : 'image/jpeg');

    if (this.isServerlessEnvironment()) {
      const publicUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      return { filename, publicUrl };
    }

    try {
      this.init();
      const filePath = path.join(this.uploadBaseDir, 'avatars', filename);
      await fs.promises.writeFile(filePath, fileBuffer);

      const publicUrl = `/uploads/avatars/${filename}`;
      return { filename, publicUrl };
    } catch (err: unknown) {
      logger.warn('[StorageService] Disk write failed for avatar, falling back to base64 data URI', {
        error: err instanceof Error ? err.message : String(err),
      });
      const publicUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      return { filename, publicUrl };
    }
  }

  /**
   * Saves a media attachment (image, audio, video, document) to disk or data URI.
   */
  static async saveMedia(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<StoredMediaResult> {
    const ext = path.extname(originalName) || '';
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}${cleanExt}`;
    const category = getMediaCategory(mimeType);

    if (this.isServerlessEnvironment()) {
      const publicUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      return {
        fileName: originalName,
        storageKey: filename,
        publicUrl,
        fileSize: fileBuffer.length,
        mimeType,
        type: category,
      };
    }

    try {
      this.init();
      const filePath = path.join(this.uploadBaseDir, 'media', filename);
      await fs.promises.writeFile(filePath, fileBuffer);

      const publicUrl = `/uploads/media/${filename}`;

      return {
        fileName: originalName,
        storageKey: filename,
        publicUrl,
        fileSize: fileBuffer.length,
        mimeType,
        type: category,
      };
    } catch (err: unknown) {
      logger.warn('[StorageService] Disk write failed for media, falling back to base64 data URI', {
        error: err instanceof Error ? err.message : String(err),
      });
      const publicUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      return {
        fileName: originalName,
        storageKey: filename,
        publicUrl,
        fileSize: fileBuffer.length,
        mimeType,
        type: category,
      };
    }
  }

  /**
   * Resolves the absolute path to a stored media file.
   */
  static getFilePath(storageKey: string): string {
    if (!storageKey || storageKey.startsWith('data:')) return '';
    const safeKey = path.basename(storageKey); // prevent directory traversal
    return path.join(this.uploadBaseDir, 'media', safeKey);
  }

  /**
   * Checks if a file exists on disk.
   */
  static fileExists(storageKey: string): boolean {
    if (!storageKey || storageKey.startsWith('data:')) return false;
    const filePath = this.getFilePath(storageKey);
    return filePath ? fs.existsSync(filePath) : false;
  }

  /**
   * Deletes a file from disk if it exists.
   */
  static async deleteFile(target: string): Promise<void> {
    if (!target || target.startsWith('data:')) return;
    try {
      let fullPath: string;
      if (target.startsWith('/uploads/')) {
        const relativePart = target.replace(/^\/uploads\//, '');
        fullPath = path.join(this.uploadBaseDir, relativePart);
      } else {
        fullPath = this.getFilePath(target);
      }

      if (fullPath && fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (err: unknown) {
      logger.warn('[StorageService] Failed to delete file', {
        target,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
