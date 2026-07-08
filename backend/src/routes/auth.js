import { Router } from 'express';
import { getSession, postLogin, postLogout } from '../controllers/authController.js';

const router = Router();

router.post('/login', postLogin);
router.get('/session', getSession);
router.post('/logout', postLogout);

export default router;
