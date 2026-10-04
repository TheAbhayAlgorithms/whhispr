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

  static init(): void {
    const avatarDir = path.join(this.uploadBaseDir, 'avatars');
    const mediaDir = path.join(this.uploadBaseDir, 'media');

    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
  }

  /**
   * Saves an avatar image to disk and returns the relative public URL path.
   */
  static async saveAvatar(
    fileBuffer: Buffer,
    originalExtension: string,
  ): Promise<{ filename: string; publicUrl: string }> {
    this.init();
    const cleanExt = originalExtension.startsWith('.')
      ? originalExtension
      : `.${originalExtension}`;
    const filename = `${crypto.randomUUID()}${cleanExt}`;
    const filePath = path.join(this.uploadBaseDir, 'avatars', filename);

    await fs.promises.writeFile(filePath, fileBuffer);

    const publicUrl = `/uploads/avatars/${filename}`;
    return { filename, publicUrl };
  }

  /**
   * Saves a media attachment (image, audio, video, document) to disk.
   */
  static async saveMedia(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<StoredMediaResult> {
    this.init();
    const ext = path.extname(originalName) || '';
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}${cleanExt}`;

    const filePath = path.join(this.uploadBaseDir, 'media', filename);
    await fs.promises.writeFile(filePath, fileBuffer);

    const category = getMediaCategory(mimeType);
    const publicUrl = `/uploads/media/${filename}`;

    return {
      fileName: originalName,
      storageKey: filename,
      publicUrl,
      fileSize: fileBuffer.length,
      mimeType,
      type: category,
    };
  }

  /**
   * Resolves the absolute path to a stored media file.
   */
  static getFilePath(storageKey: string): string {
    const safeKey = path.basename(storageKey); // prevent directory traversal
    return path.join(this.uploadBaseDir, 'media', safeKey);
  }

  /**
   * Checks if a file exists on disk.
   */
  static fileExists(storageKey: string): boolean {
    const filePath = this.getFilePath(storageKey);
    return fs.existsSync(filePath);
  }

  /**
   * Deletes a file from disk if it exists.
   */
  static async deleteFile(target: string): Promise<void> {
    try {
      let fullPath: string;
      if (target.startsWith('/uploads/')) {
        const relativePart = target.replace(/^\/uploads\//, '');
        fullPath = path.join(this.uploadBaseDir, relativePart);
      } else {
        fullPath = this.getFilePath(target);
      }

      if (fs.existsSync(fullPath)) {
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
