import { Router } from 'express';
import { getSalesHistory, postSalesHistory } from '../controllers/salesController.js';

const router = Router();

router.get('/history', getSalesHistory);
router.post('/history', postSalesHistory);

export default router;
