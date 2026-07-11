import { DEFAULT_ROOM_ID } from '../constants/defaults.js';
import { roomManager } from '../services/gameEngine.js';
import { validateCartelaForRoom } from '../services/validationService.js';
import { finalizeValidatedWinner } from '../services/winnerResultService.js';
import { createRequestTimer, measureSync } from '../utils/requestTimer.js';

function getRoomId(value) {
  return value || DEFAULT_ROOM_ID;
}

function getSalesConfig(body = {}) {
  if (
    body.betAmount === undefined
    && body.cardsSold === undefined
    && body.totalSales === undefined
  ) {
    return null;
  }

  return {
    betAmount: body.betAmount,
    cardsSold: body.cardsSold,
    totalSales: body.totalSales,
    selectedCartelas: body.selectedCartelas,
    closed: body.closed,
  };
}

function emitGameState(io, roomId) {
  const room = roomManager.getRoom(roomId);
  io.to(roomId).emit('game:state', room.getPublicState());
}

export function getGameState(req, res) {
  const timer = createRequestTimer('GET /api/game/state');
  const roomId = getRoomId(req.query.roomId);
  const roomMeasured = measureSync(() => roomManager.getRoom(roomId));
  const stateMeasured = measureSync(() => roomMeasured.value.getPublicState());
  const profile = timer.log({
    roomId,
    mongoQueryMs: 0,
    roomResolveMs: Number(roomMeasured.ms.toFixed(2)),
    serializationMs: Number(stateMeasured.ms.toFixed(2)),
  });
  res.setHeader(
    'Server-Timing',
    [
      `room;dur=${profile.roomResolveMs};desc="Room resolve"`,
      `serialize;dur=${profile.serializationMs};desc="Serialization"`,
      `total;dur=${profile.totalMs};desc="Total handler"`,
    ].join(', '),
  );
  res.setHeader('Access-Control-Expose-Headers', 'Server-Timing');
  res.json(stateMeasured.value);
}

export function configureGameSales(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const room = roomManager.getRoom(roomId);
  const salesConfig = getSalesConfig(req.body);

  if (!salesConfig) {
    res.status(400).json({ error: 'betAmount or cardsSold is required' });
    return;
  }

  const prize = room.configureSales(salesConfig);

  console.log(
    '[game-sales] configured',
    JSON.stringify({
      cardsSold: room.sales?.cardsSold ?? 0,
      betAmount: room.sales?.betAmount ?? 0,
      totalSales: room.sales?.totalSales ?? 0,
      prizePool: prize?.prizePool ?? 0,
    }),
  );

  const io = req.app.get('io');
  if (io) emitGameState(io, roomId);

  res.json({
    sales: room.sales,
    prize,
    state: room.getPublicState(),
  });
}

export function lockGamePrize(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const room = roomManager.getRoom(roomId);
  const salesConfig = getSalesConfig(req.body);

  if (
    salesConfig
    && !room.isPrizeLocked()
    && room.status !== 'running'
    && room.status !== 'paused'
  ) {
    room.configureSales(salesConfig);
  }

  const prize = room.lockPrize();

  const io = req.app.get('io');
  if (io) emitGameState(io, roomId);

  res.json({
    sales: room.sales,
    prize,
    state: room.getPublicState(),
  });
}

export function getPrizePool(req, res) {
  const roomId = getRoomId(req.query.roomId);
  const room = roomManager.getRoom(roomId);
  const prize = room.refreshPrizePool();
  res.json(prize);
}

export function startGame(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const io = req.app.get('io');
  const room = roomManager.getRoom(roomId);
  const salesConfig = getSalesConfig(req.body);

  room.onBallCalled = (number, state) => {
    if (!io) return;
    io.to(roomId).emit('ball:called', {
      number,
      state,
    });
    io.to(roomId).emit('game:state', state);
  };

  const state = room.start(room.onBallCalled, salesConfig);
  const settings = room.loadActiveSettings();

  if (io) {
    io.to(roomId).emit('settings:updated', {
      sound: { speed: settings.speed },
      patterns: settings.patterns,
      speed: settings.speed,
      intervalMs: settings.intervalMs,
    });
    io.to(roomId).emit('game:state', state);
  }

  res.json(state);
}

export function pauseGame(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const io = req.app.get('io');
  const room = roomManager.getRoom(roomId);
  const state = room.pause();

  if (io) emitGameState(io, roomId);
  res.json(state);
}

export function resumeGame(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const io = req.app.get('io');
  const room = roomManager.getRoom(roomId);

  room.onBallCalled = (number, state) => {
    if (!io) return;
    io.to(roomId).emit('ball:called', { number, state });
    io.to(roomId).emit('game:state', state);
  };

  const state = room.resume(room.onBallCalled);
  if (io) emitGameState(io, roomId);
  res.json(state);
}

export function shuffleGame(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const io = req.app.get('io');
  const room = roomManager.getRoom(roomId);

  try {
    const state = room.shuffle();
    if (io) emitGameState(io, roomId);
    res.json(state);
  } catch (error) {
    res.status(409).json({ error: error.message });
  }
}

export function resetGame(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const io = req.app.get('io');
  const room = roomManager.getRoom(roomId);
  const state = room.hardReset();

  if (io) emitGameState(io, roomId);
  res.json(state);
}

export function checkCartela(req, res) {
  const timer = createRequestTimer('POST /api/game/check');
  const roomId = getRoomId(req.body?.roomId);
  const cartelaNumber = req.body?.cartelaNumber ?? req.body?.cartelaNo;

  if (cartelaNumber === undefined || cartelaNumber === null || cartelaNumber === '') {
    timer.log({ ok: false, error: 'cartelaNumber required' });
    res.status(400).json({ error: 'cartelaNumber is required' });
    return;
  }

  const validationMeasured = measureSync(() => validateCartelaForRoom({
    cartelaNumber,
    roomId,
    action: 'check',
  }));
  const profile = timer.log({
    cartelaNumber,
    mongoQueryMs: 0,
    validationMs: Number(validationMeasured.ms.toFixed(2)),
    ok: true,
  });
  res.setHeader(
    'Server-Timing',
    [
      `validate;dur=${profile.validationMs};desc="Validation"`,
      `total;dur=${profile.totalMs};desc="Total handler"`,
    ].join(', '),
  );
  res.setHeader('Access-Control-Expose-Headers', 'Server-Timing');
  res.json(validationMeasured.value);
}

export async function claimBingo(req, res) {
  const roomId = getRoomId(req.body?.roomId);
  const cartelaNumber = req.body?.cartelaNumber ?? req.body?.cartelaNo;

  if (cartelaNumber === undefined || cartelaNumber === null || cartelaNumber === '') {
    res.status(400).json({ error: 'cartelaNumber is required' });
    return;
  }

  const result = validateCartelaForRoom({
    cartelaNumber,
    roomId,
    action: 'bingo',
  });

  if (result.valid) {
    const io = req.app.get('io');
    const room = roomManager.getRoom(roomId);
    const finalized = await finalizeValidatedWinner(room, result, cartelaNumber);
    Object.assign(result, finalized);
    if (io) {
      io.to(roomId).emit('bingo:validated', result);
      emitGameState(io, roomId);
    }
  }

  res.json(result);
}
