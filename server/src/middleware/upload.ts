import multer from 'multer';
import { BadRequestError } from '../utils/errors';

export type MediaCategory = 'image' | 'video' | 'audio' | 'document';

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MEDIA_MIME_TYPES: Record<MediaCategory, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/zip',
    'application/x-zip-compressed',
  ],
};

const ALL_ALLOWED_MEDIA_MIMES = [
  ...ALLOWED_MEDIA_MIME_TYPES.image,
  ...ALLOWED_MEDIA_MIME_TYPES.audio,
  ...ALLOWED_MEDIA_MIME_TYPES.video,
  ...ALLOWED_MEDIA_MIME_TYPES.document,
];

const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50 MB

export function getMediaCategory(mimetype: string): MediaCategory {
  if (ALLOWED_MEDIA_MIME_TYPES.image.includes(mimetype)) return 'image';
  if (ALLOWED_MEDIA_MIME_TYPES.audio.includes(mimetype)) return 'audio';
  if (ALLOWED_MEDIA_MIME_TYPES.video.includes(mimetype)) return 'video';
  return 'document';
}

const memoryStorage = multer.memoryStorage();

export const uploadAvatarMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          'Invalid file format. Only JPEG, PNG, WEBP, and GIF images are allowed.',
          'INVALID_FILE_TYPE',
        ),
      );
    }
  },
});

export const uploadMediaMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_MEDIA_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALL_ALLOWED_MEDIA_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Unsupported file format (${file.mimetype}). Allowed types: images, audio, video, PDF, Office documents, text, and zip archives.`,
          'UNSUPPORTED_FILE_TYPE',
        ),
      );
    }
  },
});
