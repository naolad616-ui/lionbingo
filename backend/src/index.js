import './loadEnv.js';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { initializeDatabase } from './config/database.js';
import { initializeCartelas } from './services/cartelaService.js';
import { loadSettingsCache } from './services/settingsCache.js';
import { ensureDefaultUser } from './services/userService.js';
import { ensureDefaultAdmin } from './services/adminAuthService.js';
import { initializeSocket } from './socket/index.js';

const PORT = process.env.PORT || 3001;

async function startServer() {
  await initializeDatabase();
  await loadSettingsCache();
  await initializeCartelas();
  await ensureDefaultUser();
  await ensureDefaultAdmin();

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || true,
      methods: ['GET', 'POST'],
    },
  });

  app.set('io', io);
  initializeSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((error) => {
  console.error('[startup] Failed to start server:', error);
  process.exit(1);
});
