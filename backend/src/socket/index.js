import { DEFAULT_ROOM_ID, speedToIntervalMs } from '../constants/defaults.js';
import {
  getPatternSettings,
  getSoundSettings,
  savePatternSettings,
  saveSoundSettings,
} from '../services/settingsService.js';
import { saveCommissionTiers } from '../services/commissionService.js';
import { roomManager } from '../services/gameEngine.js';
import { validateCartelaForRoom } from '../services/validationService.js';
import { finalizeValidatedWinner } from '../services/winnerResultService.js';
import {
  getOnlineCount,
  trackSocketDisconnect,
  trackSocketJoin,
} from '../services/presenceService.js';

function getRoomId(payload = {}) {
  return payload.roomId || DEFAULT_ROOM_ID;
}

function broadcastGameState(io, roomId) {
  const room = roomManager.getRoom(roomId);
  io.to(roomId).emit('game:state', room.getPublicState());
}

function broadcastPresence(io, roomId) {
  io.to(roomId).emit('presence:updated', {
    roomId,
    onlinePlayers: getOnlineCount(roomId),
  });
}

function broadcastSettings(io, roomId) {
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

function getSalesConfig(payload = {}) {
  if (
    payload.betAmount === undefined
    && payload.cardsSold === undefined
    && payload.totalSales === undefined
  ) {
    return null;
  }

  return {
    betAmount: payload.betAmount,
    cardsSold: payload.cardsSold,
    totalSales: payload.totalSales,
    selectedCartelas: payload.selectedCartelas,
    closed: payload.closed,
  };
}

function attachBallHandler(io, room, roomId) {
  room.onBallCalled = (number, state) => {
    io.to(roomId).emit('ball:called', { number, state });
    io.to(roomId).emit('game:state', state);
  };
}

export function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.data.joinedRooms = [];

    socket.on('join-room', (payload = {}) => {
      const roomId = getRoomId(payload);
      socket.join(roomId);
      trackSocketJoin(roomId, socket.id);
      if (!socket.data.joinedRooms.includes(roomId)) {
        socket.data.joinedRooms.push(roomId);
      }

      const room = roomManager.getRoom(roomId);
      room.loadActiveSettings();

      socket.emit('game:state', room.getPublicState());
      socket.emit('settings:updated', {
        sound: getSoundSettings(),
        patterns: room.patterns,
        speed: room.speed,
        intervalMs: room.intervalMs,
      });
      broadcastPresence(io, roomId);
    });

    socket.on('game:start', (payload = {}) => {
      const roomId = getRoomId(payload);
      socket.join(roomId);
      const room = roomManager.getRoom(roomId);
      attachBallHandler(io, room, roomId);

      const state = room.start(room.onBallCalled, getSalesConfig(payload));
      const settings = room.loadActiveSettings();

      io.to(roomId).emit('settings:updated', {
        sound: { speed: settings.speed },
        patterns: settings.patterns,
        speed: settings.speed,
        intervalMs: settings.intervalMs,
      });
      io.to(roomId).emit('game:state', state);
    });

    socket.on('game:pause', (payload = {}) => {
      const roomId = getRoomId(payload);
      const room = roomManager.getRoom(roomId);
      const state = room.pause();
      broadcastGameState(io, roomId);
      socket.emit('game:state', state);
    });

    socket.on('game:resume', (payload = {}) => {
      const roomId = getRoomId(payload);
      const room = roomManager.getRoom(roomId);
      attachBallHandler(io, room, roomId);
      const state = room.resume(room.onBallCalled);
      broadcastGameState(io, roomId);
      socket.emit('game:state', state);
    });

    socket.on('game:shuffle', (payload = {}) => {
      const roomId = getRoomId(payload);
      const room = roomManager.getRoom(roomId);

      try {
        const state = room.shuffle();
        broadcastGameState(io, roomId);
        socket.emit('game:state', state);
      } catch (error) {
        socket.emit('game:error', { error: error.message });
      }
    });

    socket.on('game:reset', (payload = {}) => {
      const roomId = getRoomId(payload);
      const room = roomManager.getRoom(roomId);
      const state = room.hardReset();
      broadcastGameState(io, roomId);
      socket.emit('game:state', state);
    });

    socket.on('game:configure', (payload = {}) => {
      const roomId = getRoomId(payload);
      const room = roomManager.getRoom(roomId);
      const salesConfig = getSalesConfig(payload);

      if (!salesConfig) {
        socket.emit('game:error', { error: 'betAmount or cardsSold is required' });
        return;
      }

      const prize = room.configureSales(salesConfig);
      broadcastGameState(io, roomId);
      socket.emit('game:configured', {
        sales: room.sales,
        prize,
        state: room.getPublicState(),
      });
    });

    socket.on('game:lock-prize', (payload = {}) => {
      const roomId = getRoomId(payload);
      const room = roomManager.getRoom(roomId);
      const salesConfig = getSalesConfig(payload);

      if (salesConfig && !room.isPrizeLocked() && room.status === 'idle') {
        room.configureSales(salesConfig);
      }

      const prize = room.lockPrize();
      broadcastGameState(io, roomId);
      socket.emit('game:prize-locked', {
        sales: room.sales,
        prize,
        state: room.getPublicState(),
      });
    });

    socket.on('commission:save', (payload = {}) => {
      const tiers = saveCommissionTiers(payload.tiers ?? payload);
      io.emit('commission:updated', { tiers });
    });

    socket.on('settings:save-sound', (payload = {}) => {
      const roomId = getRoomId(payload);
      saveSoundSettings(payload);
      broadcastSettings(io, roomId);
    });

    socket.on('settings:save-patterns', (payload = {}) => {
      const roomId = getRoomId(payload);
      savePatternSettings(payload.patterns ?? payload);
      broadcastSettings(io, roomId);
    });

    socket.on('check-card', (payload = {}) => {
      const roomId = getRoomId(payload);
      const result = validateCartelaForRoom({
        cartelaNumber: payload.cartelaNumber ?? payload.cartelaNo,
        roomId,
        action: 'check',
      });
      socket.emit('check:result', result);
    });

    socket.on('bingo', (payload = {}) => {
      const roomId = getRoomId(payload);
      const result = validateCartelaForRoom({
        cartelaNumber: payload.cartelaNumber ?? payload.cartelaNo,
        roomId,
        action: 'bingo',
      });

      if (result.valid) {
        const room = roomManager.getRoom(roomId);
        const finalized = finalizeValidatedWinner(
          room,
          result,
          payload.cartelaNumber ?? payload.cartelaNo,
        );
        Object.assign(result, finalized);
        io.to(roomId).emit('bingo:validated', result);
        broadcastGameState(io, roomId);
      }

      socket.emit('bingo:result', result);
    });

    socket.on('disconnect', () => {
      const rooms = Array.isArray(socket.data.joinedRooms) ? [...socket.data.joinedRooms] : [];
      trackSocketDisconnect(socket.id, rooms);
      for (const roomId of rooms) {
        broadcastPresence(io, roomId);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
