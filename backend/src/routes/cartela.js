import { Router } from 'express';
import { getCartelaByNumber } from '../controllers/cartelaController.js';

const router = Router();

router.get('/:cartelaNo', getCartelaByNumber);

export default router;
