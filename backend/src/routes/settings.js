import { Router } from 'express';
import {
  getGameSetupSettingsHandler,
  getPatternSettingsHandler,
  getSettings,
  getSoundSettingsHandler,
  updateGameSetupSettings,
  updatePatternSettings,
  updateSoundSettings,
} from '../controllers/settingsController.js';

const router = Router();

router.get('/', getSettings);
router.get('/sound', getSoundSettingsHandler);
router.put('/sound', updateSoundSettings);
router.get('/patterns', getPatternSettingsHandler);
router.put('/patterns', updatePatternSettings);
router.get('/game-setup', getGameSetupSettingsHandler);
router.put('/game-setup', updateGameSetupSettings);

export default router;
