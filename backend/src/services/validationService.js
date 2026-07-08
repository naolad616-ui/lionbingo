import { DEFAULT_ROOM_ID } from '../constants/defaults.js';
import { getCartelaGrid } from './cartelaService.js';
import { roomManager } from './gameEngine.js';
import { validateCartelaWin } from './patternValidation.js';

export function validateCartelaForRoom({
  cartelaNumber,
  roomId = DEFAULT_ROOM_ID,
  action = 'check',
}) {
  const room = roomManager.getRoom(roomId);
  const grid = getCartelaGrid(cartelaNumber);

  if (!grid) {
    return {
      valid: false,
      action,
      cartelaNumber: Number(cartelaNumber),
      reason: 'cartela-not-found',
      matchedPattern: null,
    };
  }

  const result = validateCartelaWin({
    grid,
    calledNumbers: room.calledNumbers,
    patternSettings: room.patterns,
    currentCall: room.getCurrentCall(),
  });

  return {
    ...result,
    action,
    cartelaNumber: Number(cartelaNumber),
    currentCall: room.getCurrentCall(),
    calledCount: room.calledNumbers.length,
    patterns: { ...room.patterns },
  };
}
