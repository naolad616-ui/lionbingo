import {
  isCheckCardCelebrationWin,
  isCheckCardMissedWin,
  isCheckCardNotWinResult,
} from './checkCard';

const SOUNDS_BASE_PATH = '/sounds';
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;

/** Reusable HTMLAudioElement instances keyed by file name (no per-call download). */
const audioCache = new Map();

let activeAudio = null;
let activePlaybackToken = 0;
let lastCheckCardWinSoundKey = null;
let preloadPromise = null;

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

  files.push('win.mp3', 'not-win.mp3', 'pause.mp3', 'shuffle.mp3');
  return files;
}

function getCachedAudio(fileName) {
  let audio = audioCache.get(fileName);
  if (audio) {
    return audio;
  }

  audio = new Audio();
  audio.preload = 'auto';
  audio.src = soundPath(fileName);
  audioCache.set(fileName, audio);
  return audio;
}

function waitForAudioReady(audio) {
  if (audio.readyState >= HAVE_FUTURE_DATA) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('error', onError);
      resolve(ok);
    };

    const onReady = () => finish(true);
    const onError = () => finish(false);

    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('loadeddata', onReady);
    audio.addEventListener('error', onError);

    // Kick off network fetch/decode without blocking the caller.
    try {
      audio.load();
    } catch {
      finish(false);
    }
  });
}

/**
 * Preload ball + UI sounds into a reusable Audio cache.
 * Safe to call multiple times; yields between batches to avoid UI freezes.
 */
export function preloadGameSounds() {
  if (preloadPromise) {
    return preloadPromise;
  }

  const files = listGameSoundFiles();

  preloadPromise = (async () => {
    const batchSize = 6;

    for (let index = 0; index < files.length; index += batchSize) {
      const batch = files.slice(index, index + batchSize);
      await Promise.all(
        batch.map(async (fileName) => {
          const audio = getCachedAudio(fileName);
          await waitForAudioReady(audio);
        }),
      );

      // Yield so number-call UI / React work can run between batches.
      await new Promise((resolve) => {
        window.setTimeout(resolve, 0);
      });
    }

    console.log('[game-sound] preload complete', { count: audioCache.size });
    return true;
  })().catch((error) => {
    console.warn('[game-sound] preload failed', error);
    preloadPromise = null;
    return false;
  });

  return preloadPromise;
}

function stopActiveSound() {
  if (!activeAudio) return;

  try {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  } catch {
    // ignore seek/pause errors on partially loaded media
  }

  activeAudio = null;
}

function logSoundFailure(fileName, audio, playError) {
  const path = soundPath(fileName);
  const mediaError = audio?.error;

  console.error('[game-sound] failed to load/play sound', {
    fileName,
    path,
    mediaErrorCode: mediaError?.code ?? null,
    mediaErrorMessage: mediaError?.message ?? null,
    playError: playError instanceof Error ? playError.message : playError ?? null,
  });
}

function logCheckCardSoundFailure(fileName, audio, playError) {
  const path = soundPath(fileName);
  const mediaError = audio?.error;

  console.error('[check-card-sound] playback failed', {
    fileName,
    path,
    mediaErrorCode: mediaError?.code ?? null,
    mediaErrorMessage: mediaError?.message ?? null,
    playError: playError instanceof Error ? playError.message : playError ?? null,
  });
}

function probeSoundFile(fileName) {
  const path = soundPath(fileName);

  return fetch(path, { method: 'HEAD' })
    .then((response) => {
      console.log('[check-card-sound] file probe', {
        path,
        status: response.status,
        ok: response.ok,
      });
      return response.ok;
    })
    .catch((error) => {
      console.error('[check-card-sound] file probe error', { path, error });
      return false;
    });
}

function playSoundFile(fileName, { logLabel, logCategory } = {}) {
  const path = soundPath(fileName);
  const token = activePlaybackToken + 1;
  activePlaybackToken = token;
  stopActiveSound();

  const logPrefix = logCategory === 'check-card' ? '[check-card-sound]' : '[game-sound]';

  if (logLabel) {
    console.log(`${logPrefix} playing sound: ${logLabel}, file=${fileName}`);
  }

  // Ensure background preload continues while calls happen.
  void preloadGameSounds();

  return new Promise((resolve) => {
    const audio = getCachedAudio(fileName);

    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };

    const onEnded = () => {
      cleanup();
      if (token !== activePlaybackToken) {
        return;
      }

      if (activeAudio === audio) {
        activeAudio = null;
      }

      resolve(true);
    };

    const onError = () => {
      cleanup();
      if (token !== activePlaybackToken) {
        return;
      }

      if (logCategory === 'check-card') {
        logCheckCardSoundFailure(fileName, audio);
      } else {
        logSoundFailure(fileName, audio);
      }

      if (activeAudio === audio) {
        activeAudio = null;
      }

      resolve(false);
    };

    const startPlayback = () => {
      if (token !== activePlaybackToken) {
        return;
      }

      try {
        audio.currentTime = 0;
      } catch {
        // ignore
      }

      activeAudio = audio;
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      const playAttempt = audio.play();
      if (!playAttempt || typeof playAttempt.then !== 'function') {
        return;
      }

      playAttempt
        .then(() => {
          if (token !== activePlaybackToken) {
            return;
          }
          console.log(`${logPrefix} playback started`, { fileName, path, cached: true });
        })
        .catch((playError) => {
          if (token !== activePlaybackToken) {
            return;
          }

          cleanup();

          if (logCategory === 'check-card') {
            logCheckCardSoundFailure(fileName, audio, playError);
          } else {
            logSoundFailure(fileName, audio, playError);
          }

          if (activeAudio === audio) {
            activeAudio = null;
          }

          resolve(false);
        });
    };

    // Play immediately when already buffered; otherwise wait without creating a new Audio.
    if (audio.readyState >= HAVE_CURRENT_DATA) {
      startPlayback();
      return;
    }

    const onReady = () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      startPlayback();
    };

    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('loadeddata', onReady);

    if (audio.readyState === 0) {
      try {
        audio.load();
      } catch {
        onReady();
      }
    }
  });
}

export function primeCheckCardSoundPlayback() {
  const path = soundPath('not-win.mp3');
  console.log('[check-card-sound] CHECK button pressed.');
  console.log('[check-card-sound] Priming browser audio for check playback at:', path);

  void probeSoundFile('not-win.mp3');
  void preloadGameSounds();

  const audio = getCachedAudio('not-win.mp3');

  const playAttempt = audio.play();
  if (!playAttempt || typeof playAttempt.then !== 'function') {
    return;
  }

  playAttempt
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      console.log('[check-card-sound] Browser audio primed successfully for:', path);
    })
    .catch((error) => {
      console.warn('[check-card-sound] Browser audio prime failed (will retry after validation):', {
        path,
        error: error instanceof Error ? error.message : error,
      });
    });
}

export function playBallSound(number) {
  const ballNumber = resolveBallNumber(number);
  const fileName = getBallSoundFileName(number);

  if (ballNumber === null || !fileName) {
    console.warn('[game-sound] invalid ball number for sound playback:', number);
    return Promise.resolve(false);
  }

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
  const path = soundPath('not-win.mp3');
  console.log('[check-card-sound] Validation result: Not Winner');
  console.log('[check-card-sound] Playing not-win sound at:', path);

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
  activePlaybackToken += 1;
  stopActiveSound();
  resetCheckCardSoundState();
}
