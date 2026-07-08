import { Router } from 'express';
import {
  getCommission,
  previewPrizePool,
  updateCommission,
} from '../controllers/commissionController.js';

const router = Router();

router.get('/', getCommission);
router.put('/', updateCommission);
router.post('/preview', previewPrizePool);

export default router;
