import {
  isCheckCardCelebrationWin,
  isCheckCardMissedWin,
  isCheckCardNotWinResult,
} from './checkCard';

const SOUNDS_BASE_PATH = '/sounds';

let activeAudio = null;
let activePlaybackToken = 0;
let lastCheckCardWinSoundKey = null;

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

  let fileName;

  if (ballNumber >= 61 && ballNumber <= 75) {
    fileName = `o-${ballNumber}.mp3`;
  } else if (ballNumber >= 46) {
    fileName = `g-${ballNumber}.mp3`;
  } else if (ballNumber >= 31) {
    fileName = `n-${ballNumber}.mp3`;
  } else if (ballNumber >= 16) {
    fileName = `i-${ballNumber}.mp3`;
  } else {
    fileName = `b-${ballNumber}.mp3`;
  }

  if (ballNumber >= 61 && ballNumber <= 75) {
    console.log('[game-sound] O-range path resolved:', {
      ballNumber,
      fileName,
      path: soundPath(fileName),
    });
  }

  return fileName;
}

function stopActiveSound() {
  if (!activeAudio) return;

  activeAudio.pause();
  activeAudio.currentTime = 0;
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
    console.log(`${logPrefix} loading sound: ${logLabel}, file=${fileName}, path=${path}`);
  }

  return new Promise((resolve) => {
    const audio = new Audio(path);
    audio.preload = 'auto';

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

      activeAudio = audio;

      audio.play()
        .then(() => {
          if (token !== activePlaybackToken) {
            return;
          }

          console.log(`${logPrefix} playback started successfully`, { fileName, path });
        })
        .catch((playError) => {
          if (token !== activePlaybackToken) {
            return;
          }

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

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.load();
    startPlayback();
  });
}

export function primeCheckCardSoundPlayback() {
  const path = soundPath('not-win.mp3');
  console.log('[check-card-sound] CHECK button pressed.');
  console.log('[check-card-sound] Priming browser audio for check playback at:', path);

  void probeSoundFile('not-win.mp3');

  const audio = new Audio(path);
  audio.preload = 'auto';

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
