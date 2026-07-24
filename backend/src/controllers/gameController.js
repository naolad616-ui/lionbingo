import { DEFAULT_ROOM_ID } from '../constants/defaults.js';
import { roomManager } from '../services/gameEngine.js';
import { validateCartelaForRoom } from '../services/validationService.js';
import { finalizeValidatedWinner } from '../services/winnerResultService.js';
import { createRequestTimer, measureSync } from '../utils/requestTimer.js';
import { logLatency, markHandler } from '../utils/latencyTrace.js';

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

function emitGameState(io, roomId, req = null) {
  const emitStarted = process.hrtime.bigint();
  markHandler(req, 'socket_emit_start', { event: 'game:state', roomId });
  const room = roomManager.getRoom(roomId);
  const state = room.getPublicState();
  io.to(roomId).emit('game:state', state);
  const emitMs = Number(process.hrtime.bigint() - emitStarted) / 1e6;
  markHandler(req, 'socket_emit_finish', {
    event: 'game:state',
    roomId,
    emitMs: Number(emitMs.toFixed(2)),
  });
  logLatency({
    stage: 'socket_emit:game:state',
    roomId,
    emitMs: Number(emitMs.toFixed(2)),
    traceId: req?.latencyTrace?.id ?? null,
    action: req?.latencyTrace?.action ?? null,
  });
}

export function getGameState(req, res) {
  markHandler(req, 'backend_handler_start', { handler: 'getGameState' });
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
  markHandler(req, 'backend_handler_finish', {
    handler: 'getGameState',
    totalMs: profile.totalMs,
  });
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
  if (io) emitGameState(io, roomId, req);

  res.json({
    sales: room.sales,
    prize,
    state: room.getPublicState(),
  });
}

export function lockGamePrize(req, res) {
  markHandler(req, 'backend_handler_start', { handler: 'lockGamePrize' });
  const roomId = getRoomId(req.body?.roomId);
  const room = roomManager.getRoom(roomId);
  const salesConfig = getSalesConfig(req.body);

  if (
    salesConfig
    && !room.isPrizeLocked()
    && room.status !== 'running'
    && room.status !== 'paused'
  ) {
    markHandler(req, 'configure_sales_start');
    room.configureSales(salesConfig);
    markHandler(req, 'configure_sales_done');
  }

  markHandler(req, 'lock_prize_start');
  const prize = room.lockPrize();
  markHandler(req, 'lock_prize_done');

  const io = req.app.get('io');
  if (io) emitGameState(io, roomId, req);

  markHandler(req, 'backend_handler_finish', { handler: 'lockGamePrize' });
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
  markHandler(req, 'backend_handler_start', { handler: 'checkCartela' });
  const timer = createRequestTimer('POST /api/game/check');
  const roomId = getRoomId(req.body?.roomId);
  const cartelaNumber = req.body?.cartelaNumber ?? req.body?.cartelaNo;

  if (cartelaNumber === undefined || cartelaNumber === null || cartelaNumber === '') {
    timer.log({ ok: false, error: 'cartelaNumber required' });
    markHandler(req, 'backend_handler_finish', { handler: 'checkCartela', ok: false });
    res.status(400).json({ error: 'cartelaNumber is required' });
    return;
  }

  const validationMeasured = measureSync(() => validateCartelaForRoom({
    cartelaNumber,
    roomId,
    action: 'check',
  }));
  markHandler(req, 'validation_done', {
    validationMs: Number(validationMeasured.ms.toFixed(2)),
  });
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
  markHandler(req, 'backend_handler_finish', {
    handler: 'checkCartela',
    totalMs: profile.totalMs,
  });
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
