import { Router } from 'express';
import {
  getProfile,
  handleAvatarUploadError,
  patchProfile,
  postAvatar,
  postChangePassword,
} from '../controllers/userController.js';
import { uploadAvatar } from '../middleware/uploadAvatar.js';

const router = Router();

router.get('/profile', getProfile);
router.patch('/profile', patchProfile);
router.post('/change-password', postChangePassword);
router.post('/avatar', (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (error) => {
    if (error) {
      handleAvatarUploadError(error, req, res, next);
      return;
    }

    postAvatar(req, res, next);
  });
});

export default router;
