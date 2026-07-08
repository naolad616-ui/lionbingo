const roomPresence = new Map();

function getRoomSet(roomId = 'default') {
  const key = String(roomId || 'default');
  if (!roomPresence.has(key)) {
    roomPresence.set(key, new Set());
  }
  return roomPresence.get(key);
}

export function trackSocketJoin(roomId, socketId) {
  getRoomSet(roomId).add(socketId);
}

export function trackSocketLeave(roomId, socketId) {
  const set = getRoomSet(roomId);
  set.delete(socketId);
}

export function trackSocketDisconnect(socketId, rooms = []) {
  if (Array.isArray(rooms) && rooms.length > 0) {
    for (const roomId of rooms) {
      trackSocketLeave(roomId, socketId);
    }
    return;
  }

  for (const set of roomPresence.values()) {
    set.delete(socketId);
  }
}

export function getOnlineCount(roomId = 'default') {
  return getRoomSet(roomId).size;
}

export function getOnlineBreakdown() {
  const rooms = {};
  let total = 0;

  for (const [roomId, set] of roomPresence.entries()) {
    rooms[roomId] = set.size;
    total += set.size;
  }

  return { total, rooms };
}
