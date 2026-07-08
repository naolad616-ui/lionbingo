import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { getUploadsDir } from '../services/userService.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, getUploadsDir());
  },
  filename(_req, file, callback) {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExtension = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)
      ? extension
      : '.jpg';
    callback(null, `avatar-${Date.now()}${safeExtension}`);
  },
});

function fileFilter(_req, file, callback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed.'));
    return;
  }

  callback(null, true);
}

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export function removeUploadedFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
