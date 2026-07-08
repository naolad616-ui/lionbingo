import { Router } from 'express';
import {
  getAdminCommissionHandler,
  getAdminDashboardHandler,
  getAdminLoginHistoryHandler,
  getAdminReportsHandler,
  getAdminSessionHandler,
  getAdminSettingsHandler,
  getAdminsHandler,
  patchAdminHandler,
  postAdminChangePassword,
  postAdminLogin,
  postAdminLogout,
  postCreateAdminHandler,
  putAdminCommissionHandler,
} from '../controllers/adminController.js';
import {
  requireAdminAuth,
  requireAdminPermission,
} from '../middleware/adminAuth.js';

const router = Router();

router.post('/login', postAdminLogin);

router.use(requireAdminAuth);

router.get('/session', getAdminSessionHandler);
router.post('/logout', postAdminLogout);
router.post('/change-password', postAdminChangePassword);
router.get('/settings', getAdminSettingsHandler);

router.get('/dashboard', requireAdminPermission('dashboard'), getAdminDashboardHandler);
router.get('/reports', requireAdminPermission('reports'), getAdminReportsHandler);

router.get('/commission', requireAdminPermission('commission'), getAdminCommissionHandler);
router.put('/commission', requireAdminPermission('commission'), putAdminCommissionHandler);

router.get('/admins', requireAdminPermission('admin_management'), getAdminsHandler);
router.post('/admins', requireAdminPermission('admin_management'), postCreateAdminHandler);
router.patch('/admins/:id', requireAdminPermission('admin_management'), patchAdminHandler);

router.get('/login-history', requireAdminPermission('security'), getAdminLoginHistoryHandler);

export default router;
