/**
 * Draw-state registry for caller ball announcements.
 * A ball is finalized for announcement purposes when it is published to the board,
 * not when audio playback completes.
 */

function resolveBallNumber(number) {
  const ballNumber = Math.trunc(Number(number));
  if (!Number.isFinite(ballNumber) || ballNumber < 1 || ballNumber > 75) {
    return null;
  }
  return ballNumber;
}

/** Balls that have been published to the board (draw state). */
const boardPublishedBalls = new Set();

/**
 * Balls whose announcement slot is consumed — never send to audio again.
 * Finalized when a published ball is dispatched to the audio pipeline.
 */
const announcementFinalizedBalls = new Set();

export function resetBoardPublicationRegistry() {
  boardPublishedBalls.clear();
  announcementFinalizedBalls.clear();
}

export function markBallPublishedToBoard(number) {
  const ballNumber = resolveBallNumber(number);
  if (ballNumber !== null) {
    boardPublishedBalls.add(ballNumber);
  }
}

export function isBallPublishedToBoard(number) {
  const ballNumber = resolveBallNumber(number);
  return ballNumber !== null && boardPublishedBalls.has(ballNumber);
}

export function isBallAnnouncementFinalized(number) {
  const ballNumber = resolveBallNumber(number);
  return ballNumber !== null && announcementFinalizedBalls.has(ballNumber);
}

/**
 * Returns true when audio must not be invoked for this ball again.
 * Based on board publication, not audio completion.
 */
export function shouldNeverAnnounceBall(number) {
  return isBallAnnouncementFinalized(number);
}

/**
 * Consume the one-shot announcement slot for a board-published ball.
 * Call synchronously when dispatching audio, before any async playback.
 */
export function finalizeBallAnnouncement(number) {
  const ballNumber = resolveBallNumber(number);
  if (ballNumber !== null) {
    announcementFinalizedBalls.add(ballNumber);
  }
}

/**
 * Rebuild publication registry from an existing called-numbers list.
 * Used only when restoring draw state for a session already in progress.
 */
export function finalizeOutstandingBoardAnnouncements(calledNumbers) {
  if (!Array.isArray(calledNumbers)) {
    return;
  }

  for (const value of calledNumbers) {
    const ballNumber = resolveBallNumber(value);
    if (ballNumber !== null && boardPublishedBalls.has(ballNumber)) {
      announcementFinalizedBalls.add(ballNumber);
    }
  }
}

/**
 * Rebuild publication registry from an existing called-numbers list.
 * Used when resuming a paused game so board-visible balls stay sealed.
 */
export function syncBoardRegistryFromCalledNumbers(calledNumbers) {
  if (!Array.isArray(calledNumbers)) {
    return;
  }

  for (const value of calledNumbers) {
    const ballNumber = resolveBallNumber(value);
    if (ballNumber === null) {
      continue;
    }

    boardPublishedBalls.add(ballNumber);
    announcementFinalizedBalls.add(ballNumber);
  }
}
