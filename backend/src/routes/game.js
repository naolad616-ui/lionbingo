import { Router } from 'express';
import {
  checkCartela,
  claimBingo,
  configureGameSales,
  getGameState,
  getPrizePool,
  lockGamePrize,
  pauseGame,
  resetGame,
  resumeGame,
  shuffleGame,
  startGame,
} from '../controllers/gameController.js';

const router = Router();

router.get('/state', getGameState);
router.get('/prize-pool', getPrizePool);
router.post('/configure', configureGameSales);
router.post('/lock-prize', lockGamePrize);
router.post('/start', startGame);
router.post('/pause', pauseGame);
router.post('/resume', resumeGame);
router.post('/shuffle', shuffleGame);
router.post('/reset', resetGame);
router.post('/check', checkCartela);
router.post('/bingo', claimBingo);

export default router;
