import {
  changeUserPassword,
  getUserProfile,
  updateUserAvatar,
  updateUserProfile,
  validateNewPassword,
} from '../services/userService.js';
import { removeUploadedFile } from '../middleware/uploadAvatar.js';

function sendProfile(res, profile) {
  res.json({
    id: profile.id,
    name: profile.name,
    username: profile.username,
    avatarPath: profile.avatar_path,
    passwordIsSet: Boolean(profile.password_set_by_user),
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  });
}

export function getProfile(req, res) {
  const profile = getUserProfile();
  if (!profile) {
    res.status(404).json({ error: 'User profile not found.' });
    return;
  }

  sendProfile(res, profile);
}

export function patchProfile(req, res) {
  const result = updateUserProfile({
    name: req.body?.name,
    username: req.body?.username,
  });

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  sendProfile(res, result.profile);
}

export function postChangePassword(req, res) {
  const oldPassword = req.body?.oldPassword;
  const newPassword = req.body?.newPassword;
  const confirmPassword = req.body?.confirmPassword;

  if (!newPassword || !confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation are required.' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation do not match.' });
    return;
  }

  const passwordResult = validateNewPassword(newPassword);
  if (!passwordResult.ok) {
    res.status(400).json({ error: passwordResult.error });
    return;
  }

  const result = changeUserPassword({
    oldPassword,
    newPassword: passwordResult.value,
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ ok: true, message: 'Password changed successfully.' });
}

export function postAvatar(req, res) {
  if (!req.file) {
    res.status(400).json({ error: 'Profile photo file is required.' });
    return;
  }

  const relativePath = `/uploads/avatars/${req.file.filename}`;

  try {
    const result = updateUserAvatar(relativePath, req.file.path);
    sendProfile(res, result.profile);
  } catch (error) {
    removeUploadedFile(req.file.path);
    res.status(500).json({ error: error.message || 'Failed to save profile photo.' });
  }
}

export function handleAvatarUploadError(error, req, res, next) {
  if (req.file?.path) {
    removeUploadedFile(req.file.path);
  }

  if (error?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'Profile photo must be 5 MB or smaller.' });
    return;
  }

  if (error) {
    res.status(400).json({ error: error.message || 'Failed to upload profile photo.' });
    return;
  }

  next();
}
