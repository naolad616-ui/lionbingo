import {
  getAllSettings,
  getGameSetupSettings,
  getPatternSettings,
  getSoundSettings,
  saveGameSetupSettings,
  savePatternSettings,
  saveSoundSettings,
} from '../services/settingsService.js';
import { DEFAULT_ROOM_ID, speedToIntervalMs } from '../constants/defaults.js';
import { roomManager } from '../services/gameEngine.js';

function emitSettingsUpdate(io, roomId = DEFAULT_ROOM_ID) {
  const sound = getSoundSettings();
  const patterns = getPatternSettings();
  const room = roomManager.getRoom(roomId);

  room.updateSpeedFromSettings();
  room.updatePatternsFromSettings();

  io.to(roomId).emit('settings:updated', {
    sound,
    patterns,
    speed: sound.speed,
    intervalMs: speedToIntervalMs(sound.speed),
  });
}

export function getSettings(_req, res) {
  res.json(getAllSettings());
}

export function getSoundSettingsHandler(_req, res) {
  const sound = getSoundSettings();
  res.json({
    ...sound,
    intervalMs: speedToIntervalMs(sound.speed),
  });
}

export function updateSoundSettings(req, res) {
  const sound = saveSoundSettings(req.body ?? {});
  const io = req.app.get('io');
  const roomId = req.body?.roomId || DEFAULT_ROOM_ID;

  if (io) {
    emitSettingsUpdate(io, roomId);
  }

  res.json({
    ...sound,
    intervalMs: speedToIntervalMs(sound.speed),
  });
}

export function getPatternSettingsHandler(_req, res) {
  res.json(getPatternSettings());
}

export function updatePatternSettings(req, res) {
  const patterns = savePatternSettings(req.body ?? {});
  const io = req.app.get('io');
  const roomId = req.body?.roomId || DEFAULT_ROOM_ID;

  if (io) {
    emitSettingsUpdate(io, roomId);
  }

  res.json(patterns);
}

export function getGameSetupSettingsHandler(_req, res) {
  res.json(getGameSetupSettings());
}

export function updateGameSetupSettings(req, res) {
  const gameSetup = saveGameSetupSettings(req.body ?? {});
  res.json(gameSetup);
}
