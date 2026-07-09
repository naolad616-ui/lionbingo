import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, '../data/uploads');
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const frontendSoundsSource = path.resolve(__dirname, '../../frontend/sounds');
const frontendSoundsDist = path.join(frontendDist, 'sounds');
const frontendIndex = path.join(frontendDist, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndex);
const soundsRoot = fs.existsSync(frontendSoundsDist)
  ? frontendSoundsDist
  : frontendSoundsSource;

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));
app.use('/sounds', express.static(soundsRoot));
app.use('/api', routes);

if (hasFrontendBuild) {
  app.use(express.static(frontendDist));

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    if (
      req.path.startsWith('/api')
      || req.path.startsWith('/uploads')
      || req.path.startsWith('/sounds')
      || req.path.startsWith('/socket.io')
    ) {
      return next();
    }

    res.sendFile(frontendIndex, (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

export default app;
