import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { initializeDatabase } from './config/database.js';
import { initializeCartelas } from './services/cartelaService.js';
import { ensureDefaultUser } from './services/userService.js';
import { ensureDefaultAdmin } from './services/adminAuthService.js';
import { initializeSocket } from './socket/index.js';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

initializeDatabase();
initializeCartelas();
ensureDefaultUser();
ensureDefaultAdmin();

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
