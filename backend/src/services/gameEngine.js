import { DEFAULT_ROOM_ID, speedToIntervalMs } from '../constants/defaults.js';
import { calculatePrizePool, normalizeGameSales } from './prizePoolService.js';
import { getPatternSettings, getSoundSettings } from './settingsService.js';

const EXPECTED_CARD_COUNT = 150;

function createShuffledDraw() {
  const numbers = Array.from({ length: 75 }, (_, index) => index + 1);

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
  }

  return numbers;
}

export function normalizeSelectedCartelas(selectedCartelas) {
  if (!Array.isArray(selectedCartelas)) {
    return [];
  }

  const ids = new Set();
  for (const value of selectedCartelas) {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= EXPECTED_CARD_COUNT) {
      ids.add(parsed);
    }
  }

  return [...ids].sort((left, right) => left - right);
}

function normalizeClosed(closed, fallback = 1) {
  const parsed = Number.parseInt(String(closed ?? ''), 10);
  if (Number.isInteger(parsed) && parsed >= 1) {
    return parsed;
  }

  const fallbackParsed = Number.parseInt(String(fallback ?? ''), 10);
  if (Number.isInteger(fallbackParsed) && fallbackParsed >= 1) {
    return fallbackParsed;
  }

  return 1;
}

export class GameRoom {
  constructor(roomId = DEFAULT_ROOM_ID) {
    this.roomId = roomId;
    this.reset();
  }

  reset() {
    this.drawOrder = createShuffledDraw();
    this.calledNumbers = [];
    this.drawIndex = 0;
    this.status = 'idle';
    this.intervalMs = speedToIntervalMs(getSoundSettings().speed);
    this.speed = getSoundSettings().speed;
    this.patterns = getPatternSettings();
    this.intervalId = null;
    this.sales = null;
    this.prize = null;
    this.lockedPrize = null;
    this.lockedPatterns = null;
    this.lastWinnerResult = null;
  }

  isPatternsLocked() {
    return Boolean(this.lockedPatterns);
  }

  lockPatterns() {
    if (this.lockedPatterns) {
      this.patterns = { ...this.lockedPatterns };
      return this.patterns;
    }

    this.lockedPatterns = { ...getPatternSettings() };
    this.patterns = { ...this.lockedPatterns };
    return this.patterns;
  }

  unlockPatterns() {
    this.lockedPatterns = null;
    this.patterns = getPatternSettings();
    return this.patterns;
  }

  isPrizeLocked() {
    return Boolean(this.lockedPrize);
  }

  configureSales({ betAmount, cardsSold, totalSales, selectedCartelas, closed } = {}) {
    if (this.status === 'running' || this.status === 'paused') {
      return this.prize ?? this.refreshPrizePool();
    }

    if (this.isPrizeLocked()) {
      this.lockedPrize = null;
    }

    const normalizedSelected = normalizeSelectedCartelas(selectedCartelas);
    const normalizedSales = normalizeGameSales({
      betAmount,
      cardsSold: normalizedSelected.length > 0 ? normalizedSelected.length : cardsSold,
      totalSales,
    });

    this.sales = {
      ...normalizedSales,
      selectedCartelas: normalizedSelected,
      closed: normalizeClosed(closed, this.sales?.closed),
    };
    this.refreshPrizePool();
    return this.prize;
  }

  isCartelaSold(cartelaNumber) {
    const parsed = Number.parseInt(String(cartelaNumber), 10);
    if (!Number.isInteger(parsed) || !this.sales?.selectedCartelas?.length) {
      return false;
    }

    return this.sales.selectedCartelas.includes(parsed);
  }

  refreshPrizePool() {
    if (this.lockedPrize) {
      this.prize = { ...this.lockedPrize };
      return this.prize;
    }

    if (!this.sales) {
      this.prize = calculatePrizePool({
        totalSales: 0,
        cardsSold: 0,
        betAmount: 0,
      });
      return this.prize;
    }

    this.prize = calculatePrizePool(this.sales);
    return this.prize;
  }

  lockPrize() {
    this.lockPatterns();

    if (this.lockedPrize) {
      this.prize = { ...this.lockedPrize };
      return this.prize;
    }

    this.refreshPrizePool();
    this.lockedPrize = { ...this.prize };
    this.prize = { ...this.lockedPrize };
    return this.prize;
  }

  unlockPrize() {
    this.lockedPrize = null;
    this.unlockPatterns();
    return this.refreshPrizePool();
  }

  loadActiveSettings() {
    const sound = getSoundSettings();
    this.speed = sound.speed;
    this.intervalMs = speedToIntervalMs(sound.speed);
    if (!this.isPatternsLocked()) {
      this.patterns = getPatternSettings();
    }
    return {
      speed: this.speed,
      intervalMs: this.intervalMs,
      patterns: this.patterns,
    };
  }

  getCurrentCall() {
    return this.calledNumbers.length > 0
      ? this.calledNumbers[this.calledNumbers.length - 1]
      : null;
  }

  getPublicState() {
    return {
      roomId: this.roomId,
      status: this.status,
      calledNumbers: [...this.calledNumbers],
      currentCall: this.getCurrentCall(),
      drawIndex: this.drawIndex,
      totalNumbers: this.drawOrder.length,
      speed: this.speed,
      intervalMs: this.intervalMs,
      patterns: { ...this.patterns },
      sales: this.sales
        ? {
          ...this.sales,
          selectedCartelas: [...(this.sales.selectedCartelas ?? [])],
        }
        : null,
      prize: this.prize ? { ...this.prize } : this.refreshPrizePool(),
      prizeLocked: this.isPrizeLocked(),
      patternsLocked: this.isPatternsLocked(),
      lastWinnerResult: this.lastWinnerResult ? { ...this.lastWinnerResult } : null,
    };
  }

  clearTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  drawNext() {
    if (this.drawIndex >= this.drawOrder.length) {
      this.status = 'finished';
      this.clearTimer();
      return null;
    }

    const nextNumber = this.drawOrder[this.drawIndex];
    this.drawIndex += 1;
    this.calledNumbers.push(nextNumber);
    return nextNumber;
  }

  start(onBallCalled, salesConfig = null) {
    this.loadActiveSettings();

    if (salesConfig) {
      this.configureSales(salesConfig);
    } else if (!this.prize) {
      this.refreshPrizePool();
    }

    this.lockPatterns();
    this.lockPrize();

    if (this.drawIndex >= this.drawOrder.length) {
      return this.getPublicState();
    }

    this.clearTimer();
    this.status = 'running';

    if (this.calledNumbers.length === 0) {
      const first = this.drawNext();
      if (first !== null) onBallCalled?.(first, this.getPublicState());
    }

    this.intervalId = setInterval(() => {
      const next = this.drawNext();
      if (next === null) {
        onBallCalled?.(null, this.getPublicState());
        return;
      }
      onBallCalled?.(next, this.getPublicState());
    }, this.intervalMs);

    return this.getPublicState();
  }

  pause() {
    if (this.status !== 'running') return this.getPublicState();
    this.clearTimer();
    this.status = 'paused';
    return this.getPublicState();
  }

  resume(onBallCalled) {
    if (this.status !== 'paused') return this.getPublicState();
    return this.start(onBallCalled);
  }

  shuffle() {
    if (this.status === 'running') {
      throw new Error('Cannot shuffle while the game is running');
    }

    this.clearTimer();
    this.drawOrder = createShuffledDraw();
    this.calledNumbers = [];
    this.drawIndex = 0;
    this.status = 'idle';
    this.unlockPrize();
    this.refreshPrizePool();
    return this.getPublicState();
  }

  hardReset() {
    this.clearTimer();
    this.drawOrder = createShuffledDraw();
    this.calledNumbers = [];
    this.drawIndex = 0;
    this.status = 'idle';
    this.sales = null;
    this.lastWinnerResult = null;
    this.loadActiveSettings();
    this.unlockPrize();
    this.refreshPrizePool();
    return this.getPublicState();
  }

  updateSpeedFromSettings() {
    const sound = getSoundSettings();
    this.speed = sound.speed;
    this.intervalMs = speedToIntervalMs(sound.speed);

    if (this.status === 'running') {
      const onBallCalled = this.onBallCalled;
      this.clearTimer();
      this.intervalId = setInterval(() => {
        const next = this.drawNext();
        if (next === null) {
          onBallCalled?.(null, this.getPublicState());
          return;
        }
        onBallCalled?.(next, this.getPublicState());
      }, this.intervalMs);
    }

    return {
      speed: this.speed,
      intervalMs: this.intervalMs,
    };
  }

  updatePatternsFromSettings() {
    if (this.isPatternsLocked()) {
      return { ...this.patterns };
    }

    this.patterns = getPatternSettings();
    return { ...this.patterns };
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getRoom(roomId = DEFAULT_ROOM_ID) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new GameRoom(roomId));
    }
    return this.rooms.get(roomId);
  }
}

export const roomManager = new RoomManager();
