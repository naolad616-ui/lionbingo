import { Router } from 'express';
import commissionRoutes from './commission.js';
import settingsRoutes from './settings.js';
import gameRoutes from './game.js';
import cartelaRoutes from './cartela.js';
import userRoutes from './user.js';
import authRoutes from './auth.js';
import salesRoutes from './sales.js';
import adminRoutes from './admin.js';
import { checkCartela, getCartelaByNumber } from '../controllers/cartelaController.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/commission', commissionRoutes);
router.use('/settings', settingsRoutes);
router.use('/game', gameRoutes);
router.use('/user', userRoutes);
router.use('/auth', authRoutes);
router.use('/sales', salesRoutes);
router.use('/admin', adminRoutes);
router.post('/check-cartela', checkCartela);
router.get('/check-cartela/:cartelaNo', getCartelaByNumber);
router.get('/enter-card/:cartelaNo', getCartelaByNumber);
router.get('/cards/:cardId', getCartelaByNumber);
router.use('/cartela', cartelaRoutes);

export default router;
