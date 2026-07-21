import {
  isCheckCardCelebrationWin,
  isCheckCardMissedWin,
  isCheckCardNotWinResult,
} from './checkCard';
import {
  finalizeBallAnnouncement,
  isBallPublishedToBoard,
  shouldNeverAnnounceBall,
} from './callerDrawState';

const SOUNDS_BASE_PATH = '/sounds';
const HAVE_CURRENT_DATA = 2;
const LOAD_TIMEOUT_MS = 8000;
const PLAY_RETRY_DELAY_MS = 40;

function soundPath(fileName) {
  return `${SOUNDS_BASE_PATH}/${fileName}`;
}

function resolveBallNumber(number) {
  const ballNumber = Math.trunc(Number(number));
  if (!Number.isFinite(ballNumber) || ballNumber < 1 || ballNumber > 75) {
    return null;
  }
  return ballNumber;
}

export function getBallSoundFileName(number) {
  const ballNumber = resolveBallNumber(number);
  if (ballNumber === null) {
    return null;
  }

  if (ballNumber >= 61 && ballNumber <= 75) {
    return `o-${ballNumber}.mp3`;
  }
  if (ballNumber >= 46) {
    return `g-${ballNumber}.mp3`;
  }
  if (ballNumber >= 31) {
    return `n-${ballNumber}.mp3`;
  }
  if (ballNumber >= 16) {
    return `i-${ballNumber}.mp3`;
  }
  return `b-${ballNumber}.mp3`;
}

function listGameSoundFiles() {
  const files = [];
  for (let ballNumber = 1; ballNumber <= 75; ballNumber += 1) {
    const fileName = getBallSoundFileName(ballNumber);
    if (fileName) {
      files.push(fileName);
    }
  }
  files.push('win.mp3', 'not-win.mp3', 'pause.mp3', 'shuffle.mp3', 'dede.mp3');
  return files;
}

function isAbortError(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  const message = String(error.message || error);
  return /interrupted|aborted|abort/i.test(message);
}

/**
 * Web-Audio-first engine:
 * - Prefetch + decode once into AudioBuffers
 * - Each play() creates a fresh BufferSource (no shared-element races)
 * - Falls back to HTMLAudioElement clones when Web Audio is unavailable
 */
class GameAudioEngine {
  constructor() {
    this.audioContext = null;
    this.buffers = new Map();
    this.htmlTemplates = new Map();
    this.arrayBuffers = new Map();
    this.blobUrls = new Map();
    this.preloadPromise = null;
    this.unlocked = false;
    this.activePlaybackToken = 0;
    this.activeSource = null;
    this.activeHtmlAudio = null;
    this.activeEndedHandler = null;
    this.activeResolve = null;
    this.unlockListenersBound = false;
  }

  ensureContext() {
    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    this.audioContext = new AudioContextCtor();
    return this.audioContext;
  }

  bindUnlockListeners() {
    if (this.unlockListenersBound || typeof document === 'undefined') {
      return;
    }

    this.unlockListenersBound = true;
    const unlock = () => {
      void this.unlock();
    };

    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
  }

  async unlock() {
    this.bindUnlockListeners();
    const context = this.ensureContext();

    try {
      if (context && context.state === 'suspended') {
        await context.resume();
      }

      // Tiny silent buffer forces mobile / Telegram WebView to fully unlock.
      if (context && !this.unlocked) {
        const silence = context.createBuffer(1, 1, context.sampleRate || 22050);
        const source = context.createBufferSource();
        source.buffer = silence;
        source.connect(context.destination);
        source.start(0);
      }

      this.unlocked = true;
      return true;
    } catch (error) {
      console.warn('[game-sound] unlock failed', error);
      return false;
    }
  }

  async fetchArrayBuffer(fileName) {
    if (this.arrayBuffers.has(fileName)) {
      return this.arrayBuffers.get(fileName);
    }

    const response = await fetch(soundPath(fileName), { cache: 'default' });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    this.arrayBuffers.set(fileName, buffer);
    this.ensureBlobUrl(fileName, buffer);
    return buffer;
  }

  /**
   * Build a persistent in-memory Blob URL for a sound so it can play without
   * any further network request after preload. Idempotent per file.
   */
  ensureBlobUrl(fileName, arrayBuffer) {
    const existing = this.blobUrls.get(fileName);
    if (existing) {
      return existing;
    }

    const source = arrayBuffer ?? this.arrayBuffers.get(fileName);
    if (!source) {
      return null;
    }

    try {
      const url = URL.createObjectURL(new Blob([source], { type: 'audio/mpeg' }));
      this.blobUrls.set(fileName, url);
      return url;
    } catch (error) {
      console.warn('[game-sound] blob URL creation failed', {
        fileName,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  async decodeFile(fileName) {
    if (this.buffers.has(fileName)) {
      return this.buffers.get(fileName);
    }

    const context = this.ensureContext();
    if (!context) {
      return null;
    }

    const arrayBuffer = await this.fetchArrayBuffer(fileName);
    // copy() — decodeAudioData may detach the buffer.
    const copy = arrayBuffer.slice(0);
    const decoded = await context.decodeAudioData(copy);
    this.buffers.set(fileName, decoded);
    return decoded;
  }

  ensureHtmlTemplate(fileName) {
    let audio = this.htmlTemplates.get(fileName);
    if (audio) {
      return audio;
    }

    audio = new Audio();
    audio.preload = 'auto';
    // Prefer the in-memory Blob URL (offline-safe); fall back to network path
    // only before the blob has been created during preload.
    audio.src = this.blobUrls.get(fileName) ?? soundPath(fileName);
    this.htmlTemplates.set(fileName, audio);
    return audio;
  }

  waitForHtmlReady(audio) {
    if (audio.readyState >= HAVE_CURRENT_DATA) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('loadeddata', onReady);
        audio.removeEventListener('error', onError);
        resolve(ok);
      };

      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timeoutId = window.setTimeout(() => finish(audio.readyState >= HAVE_CURRENT_DATA), LOAD_TIMEOUT_MS);

      audio.addEventListener('canplaythrough', onReady);
      audio.addEventListener('loadeddata', onReady);
      audio.addEventListener('error', onError);

      try {
        audio.load();
      } catch {
        finish(false);
      }
    });
  }

  async preload() {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.bindUnlockListeners();
    const files = listGameSoundFiles();

    this.preloadPromise = (async () => {
      this.ensureContext();
      const batchSize = 5;

      for (let index = 0; index < files.length; index += batchSize) {
        const batch = files.slice(index, index + batchSize);
        await Promise.all(
          batch.map(async (fileName) => {
            try {
              await this.decodeFile(fileName);
            } catch (error) {
              console.warn('[game-sound] decode failed, keeping HTML fallback', {
                fileName,
                error: error instanceof Error ? error.message : error,
              });
              try {
                await this.fetchArrayBuffer(fileName);
              } catch (fetchError) {
                console.error('[game-sound] fetch failed during preload', {
                  fileName,
                  error: fetchError instanceof Error ? fetchError.message : fetchError,
                });
              }
              const template = this.ensureHtmlTemplate(fileName);
              await this.waitForHtmlReady(template);
            }
          }),
        );

        await new Promise((resolve) => {
          window.setTimeout(resolve, 0);
        });
      }

      console.log('[game-sound] preload complete', {
        buffers: this.buffers.size,
        htmlTemplates: this.htmlTemplates.size,
      });
      return true;
    })().catch((error) => {
      console.warn('[game-sound] preload failed', error);
      this.preloadPromise = null;
      return false;
    });

    return this.preloadPromise;
  }

  stopActive() {
    if (this.activeResolve) {
      const resolve = this.activeResolve;
      this.activeResolve = null;
      resolve(false);
    }

    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop(0);
      } catch {
        // already stopped
      }
      try {
        this.activeSource.disconnect();
      } catch {
        // ignore
      }
      this.activeSource = null;
    }

    if (this.activeHtmlAudio) {
      const audio = this.activeHtmlAudio;
      if (this.activeEndedHandler) {
        audio.removeEventListener('ended', this.activeEndedHandler);
        audio.removeEventListener('error', this.activeEndedHandler);
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      this.activeHtmlAudio = null;
      this.activeEndedHandler = null;
    }
  }

  stopAll() {
    this.activePlaybackToken += 1;
    this.stopActive();
  }

  playWithWebAudio(fileName, token) {
    const context = this.ensureContext();
    const buffer = this.buffers.get(fileName);
    if (!context || !buffer) {
      return null;
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (this.activeResolve === finishResolve) {
          this.activeResolve = null;
        }
        if (this.activeSource === source) {
          this.activeSource = null;
        }
        resolve(ok);
      };
      const finishResolve = finish;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      this.activeSource = source;
      this.activeResolve = finishResolve;

      source.onended = () => {
        if (token !== this.activePlaybackToken) {
          finish(false);
          return;
        }
        finish(true);
      };

      try {
        source.start(0);
      } catch (error) {
        console.error('[game-sound] BufferSource.start failed', {
          fileName,
          error: error instanceof Error ? error.message : error,
        });
        finish(false);
      }
    });
  }

  playWithHtmlAudio(fileName, token) {
    const template = this.ensureHtmlTemplate(fileName);

    return this.waitForHtmlReady(template).then((ready) => {
      if (!ready || token !== this.activePlaybackToken) {
        return false;
      }

      // Clone so rapid plays never share one element's play/pause timeline.
      const audio = template.cloneNode(true);
      audio.preload = 'auto';

      return new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          if (this.activeResolve === finish) {
            this.activeResolve = null;
          }
          if (this.activeHtmlAudio === audio) {
            this.activeHtmlAudio = null;
            this.activeEndedHandler = null;
          }
          resolve(ok);
        };

        const onEnded = () => {
          if (token !== this.activePlaybackToken) {
            finish(false);
            return;
          }
          finish(true);
        };

        const onError = () => {
          if (token !== this.activePlaybackToken) {
            finish(false);
            return;
          }
          console.error('[game-sound] HTML audio element error', {
            fileName,
            mediaErrorCode: audio.error?.code ?? null,
            mediaErrorMessage: audio.error?.message ?? null,
          });
          finish(false);
        };

        this.activeHtmlAudio = audio;
        this.activeEndedHandler = onEnded;
        this.activeResolve = finish;
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        const attemptPlay = (isRetry = false) => {
          if (token !== this.activePlaybackToken) {
            finish(false);
            return;
          }

          try {
            audio.currentTime = 0;
          } catch {
            // ignore seek issues before metadata
          }

          const playAttempt = audio.play();
          if (!playAttempt || typeof playAttempt.then !== 'function') {
            finish(true);
            return;
          }

          playAttempt
            .then(() => {
              // keep waiting for ended
            })
            .catch(async (playError) => {
              if (token !== this.activePlaybackToken) {
                finish(false);
                return;
              }

              if (isAbortError(playError)) {
                // Superseded by a newer play request — not a hard failure.
                finish(false);
                return;
              }

              if (!isRetry) {
                await this.unlock();
                window.setTimeout(() => attemptPlay(true), PLAY_RETRY_DELAY_MS);
                return;
              }

              console.error('[game-sound] HTML audio play() failed', {
                fileName,
                error: playError instanceof Error ? playError.message : playError,
              });
              finish(false);
            });
        };

        attemptPlay(false);
      });
    });
  }

  async play(fileName, { logLabel, logCategory } = {}) {
    const logPrefix = logCategory === 'check-card' ? '[check-card-sound]' : '[game-sound]';
    const token = this.activePlaybackToken + 1;
    this.activePlaybackToken = token;
    this.stopActive();

    if (logLabel) {
      console.log(`${logPrefix} playing sound: ${logLabel}, file=${fileName}`);
    }

    void this.preload();
    await this.unlock();

    if (token !== this.activePlaybackToken) {
      return false;
    }

    // Prefer Web Audio when buffer is ready; decode on demand otherwise.
    if (!this.buffers.has(fileName)) {
      try {
        await this.decodeFile(fileName);
      } catch (error) {
        console.warn('[game-sound] on-demand decode failed, using HTML fallback', {
          fileName,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    if (token !== this.activePlaybackToken) {
      return false;
    }

    if (this.buffers.has(fileName) && this.ensureContext()) {
      try {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } catch {
        // fall through to HTML
      }

      if (token !== this.activePlaybackToken) {
        return false;
      }

      const webResult = this.playWithWebAudio(fileName, token);
      if (webResult) {
        const ok = await webResult;
        if (ok) {
          console.log(`${logPrefix} playback finished`, { fileName, engine: 'webaudio' });
        }
        return ok;
      }
    }

    const htmlOk = await this.playWithHtmlAudio(fileName, token);
    if (htmlOk) {
      console.log(`${logPrefix} playback finished`, { fileName, engine: 'html' });
    }
    return htmlOk;
  }
}

const engine = new GameAudioEngine();
engine.bindUnlockListeners();

let lastCheckCardWinSoundKey = null;

export function preloadGameSounds() {
  return engine.preload();
}

function playSoundFile(fileName, options = {}) {
  return engine.play(fileName, options);
}

export function primeCheckCardSoundPlayback() {
  // Unlock audio graph only — do not play/pause not-win.mp3 (that raced real playback).
  console.log('[check-card-sound] CHECK button pressed — unlocking audio');
  void engine.unlock();
  void engine.preload();
}

export function playBallSound(number) {
  const ballNumber = resolveBallNumber(number);
  const fileName = getBallSoundFileName(number);

  if (ballNumber === null || !fileName) {
    console.warn('[game-sound] invalid ball number for sound playback:', number);
    return Promise.resolve(false);
  }

  if (shouldNeverAnnounceBall(ballNumber)) {
    return Promise.resolve(true);
  }

  if (!isBallPublishedToBoard(ballNumber)) {
    console.warn('[game-sound] refusing ball sound before board publication:', ballNumber);
    return Promise.resolve(false);
  }

  finalizeBallAnnouncement(ballNumber);

  return playSoundFile(fileName, {
    logLabel: `ball=${ballNumber}`,
  });
}

export function resetCheckCardSoundState() {
  lastCheckCardWinSoundKey = null;
}

export function playCheckCardWinSound() {
  console.log('[check-card-sound] Validation result: Winner');
  return playSoundFile('win.mp3', { logLabel: 'win', logCategory: 'check-card' });
}

export function playNotWinSound() {
  console.log('[check-card-sound] Validation result: Not Winner');
  return playSoundFile('not-win.mp3', {
    logLabel: 'not-win',
    logCategory: 'check-card',
  });
}

export function playPauseSound() {
  return playSoundFile('pause.mp3', { logLabel: 'pause' });
}

export function playShuffleSound() {
  return playSoundFile('shuffle.mp3', { logLabel: 'shuffle' });
}

export function playDuplicateCartelaSound() {
  return playSoundFile('dede.mp3', { logLabel: 'duplicate-cartela' });
}

export async function playWinThenPauseSounds() {
  console.log('[check-card-sound] Validation result: Winner');
  const winPlayed = await playCheckCardWinSound();
  if (!winPlayed) {
    console.warn('[check-card-sound] win.mp3 did not play; attempting pause.mp3');
    return playPauseSound();
  }

  return playPauseSound();
}

export async function playCheckCardResultSounds({
  purchased,
  localCheckResult,
  priorProgress = null,
  priorMiss = null,
  soundKey = null,
}) {
  console.log('[check-card-sound] Evaluating check-card sound playback', {
    purchased,
    localCheckResult,
    soundKey,
  });

  if (!purchased || !localCheckResult) {
    console.log('[check-card-sound] Skipping sound — cartela not purchased or validation did not run');
    return 'skipped';
  }

  const celebrationWin = isCheckCardCelebrationWin(localCheckResult, priorMiss);

  if (celebrationWin) {
    if (soundKey && soundKey === lastCheckCardWinSoundKey) {
      console.log('[check-card-sound] Skipping duplicate win sound for', soundKey);
      return 'win-skipped';
    }

    if (soundKey) {
      lastCheckCardWinSoundKey = soundKey;
    }

    await playCheckCardWinSound();
    console.log('[check-card-sound] win.mp3 playback finished');
    return 'win';
  }

  const missedWin = isCheckCardMissedWin(localCheckResult, priorMiss);

  if (missedWin) {
    console.log('[check-card-sound] Validation result: Missed win (passed)');
    const played = await playNotWinSound();
    console.log('[check-card-sound] not-win.mp3 playback', played ? 'succeeded' : 'failed');
    return played ? 'missed-win' : 'missed-win-failed';
  }

  if (!isCheckCardNotWinResult(localCheckResult, priorProgress, priorMiss)) {
    console.log('[check-card-sound] Skipping sound — expired or non-playable result', {
      reason: localCheckResult.reason ?? null,
      expired: localCheckResult.expired ?? false,
      progress: localCheckResult.progress ?? false,
    });
    return 'silent';
  }

  const played = await playNotWinSound();
  console.log('[check-card-sound] not-win.mp3 playback', played ? 'succeeded' : 'failed');
  return played ? 'not-win' : 'not-win-failed';
}

export function stopGameSounds() {
  engine.stopAll();
  resetCheckCardSoundState();
}
