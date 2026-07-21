import { validateCartelaWinWithClosed } from './patternValidation';
import { resolveClosedValue } from './closedRules';

export { resolveClosedValue, persistClosedValue, readStoredClosedValue, CLOSED_STORAGE_KEY } from './closedRules';

const FREE_ROW = 2;
const FREE_COL = 2;

export const CHECK_CARD_MESSAGES = {
  notFound: 'አልተመዘገበም',
  notWinner: 'አላሸነፈም',
  winner: 'አሸንፏል',
  expired: 'አልፎታል',
};

export function parseCartelaNumber(value) {
  const trimmed = String(value ?? '').trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 150) return null;

  return parsed;
}

export function mergeCalledNumbers(...lists) {
  const merged = new Set();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        merged.add(parsed);
      }
    }
  }

  return [...merged];
}

export function getLatestCalledBall(...lists) {
  let latest = null;

  for (const list of lists) {
    if (!Array.isArray(list)) continue;

    for (const value of list) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        latest = parsed;
      }
    }
  }

  return latest;
}

export function isFreeCell(row, col) {
  return row === FREE_ROW && col === FREE_COL;
}

export function isCartelaPurchased(cartelaNo, selectedCartelas) {
  const parsed = parseCartelaNumber(cartelaNo);
  if (!parsed || !Array.isArray(selectedCartelas)) {
    return false;
  }

  return selectedCartelas.includes(parsed);
}

export function isCardCellMarked({
  row,
  col,
  value,
  calledNumbers,
  cardLoaded,
  isPurchased = false,
}) {
  if (!cardLoaded || !isPurchased) return false;
  if (isFreeCell(row, col)) return true;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return false;

  return calledNumbers.includes(parsed);
}

export function isWinningCell(row, col, winningCells) {
  if (!Array.isArray(winningCells) || winningCells.length === 0) {
    return false;
  }

  return winningCells.some(
    (cell) => Number(cell?.row) === row && Number(cell?.col) === col,
  );
}

export function mergeWinningCells(...cellLists) {
  const seen = new Set();
  const cells = [];

  for (const list of cellLists) {
    if (!Array.isArray(list)) {
      continue;
    }

    for (const cell of list) {
      const row = Number(cell?.row);
      const col = Number(cell?.col);
      if (!Number.isFinite(row) || !Number.isFinite(col)) {
        continue;
      }

      const key = `${row},${col}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      cells.push({ row, col });
    }
  }

  return cells;
}

function hasCompletedWinningLines(checkResult, priorMiss = null) {
  const requiredLines = resolveClosedValue(
    priorMiss?.requiredLines,
    checkResult?.requiredLines,
    checkResult?.closed,
  );
  const completedLines = Number(
    checkResult?.completedLines
    ?? priorMiss?.linesAtLastEvaluation
    ?? priorMiss?.completedLinesAtMiss
    ?? 0,
  );

  return completedLines >= requiredLines && requiredLines > 0;
}

export function hasEverCompletedValidWinningLine(
  checkResult,
  priorState = null,
) {
  if (priorState?.confirmedWin === true) {
    return false;
  }

  if (priorState?.missedWinActive === true) {
    return true;
  }

  return hasCompletedWinningLines(checkResult);
}

export function getCellDisplayValue({ row, col, value, cardLoaded }) {
  if (isFreeCell(row, col)) {
    return 'F';
  }

  if (!cardLoaded || value === undefined || value === null || value === '') {
    return '';
  }

  return String(value);
}

export function normalizeGridForValidation(numbers) {
  if (!Array.isArray(numbers)) return null;

  return numbers.map((row, rowIndex) => {
    if (!Array.isArray(row)) return [];

    return row.map((cell, colIndex) => {
      if (rowIndex === FREE_ROW && colIndex === FREE_COL) return 0;
      if (cell === 'FREE' || cell === 'F') return 0;

      const parsed = Number(cell);
      return Number.isFinite(parsed) ? parsed : 0;
    });
  });
}

export function validateCheckCardWin({
  numbers,
  callerCalledNumbers = [],
  backendCalledNumbers = [],
  patternSettings,
  closed,
  progressionActive = false,
}) {
  const grid = normalizeGridForValidation(numbers);
  if (!grid || !patternSettings) {
    return { valid: false, matchedPattern: null, reason: 'invalid-input' };
  }

  const normalizedCalled = mergeCalledNumbers(callerCalledNumbers, backendCalledNumbers);
  const currentCall = getLatestCalledBall(callerCalledNumbers, backendCalledNumbers);
  const originalClosed = resolveClosedValue(closed);

  const result = validateCartelaWinWithClosed({
    grid,
    calledNumbers: normalizedCalled,
    patternSettings,
    currentCall,
    closed: originalClosed,
    progressionMode: progressionActive,
  });

  return {
    ...result,
    closed: originalClosed,
    originalClosed,
    progressionActive,
    requiredLines: progressionActive
      ? 1
      : (result.requiredLines ?? originalClosed),
  };
}

export function isWinOpportunityPassed(checkResult, originalClosed) {
  if (!checkResult || checkResult.valid === true || checkResult.progressionActive) {
    return false;
  }

  const requiredLines = resolveClosedValue(
    originalClosed,
    checkResult.originalClosed,
    checkResult.requiredLines,
    checkResult.closed,
  );
  const completedLines = Number(checkResult.completedLines ?? 0);

  if (completedLines < requiredLines) {
    return false;
  }

  return checkResult.expired === true || checkResult.reason === 'pattern-expired';
}

export function isCheckCardMissedWin(checkResult, priorState = null) {
  if (priorState?.confirmedWin === true) {
    return false;
  }

  if (priorState?.missedWinActive === true) {
    return true;
  }

  if (!checkResult || isFinalCheckCardWin(checkResult)) {
    return false;
  }

  if (!hasCompletedWinningLines(checkResult)) {
    return false;
  }

  if (checkResult.expired === true || checkResult.reason === 'pattern-expired') {
    return true;
  }

  return checkResult.valid !== true && checkResult.progress !== true;
}

export function accumulateCartelaLineHighlights(
  priorState = null,
  checkResult = null,
  priorProgress = null,
) {
  const completedLines = Number(checkResult?.completedLines ?? 0);
  const requiredLines = resolveClosedValue(
    priorState?.requiredLines,
    checkResult?.requiredLines,
    checkResult?.closed,
  );
  const confirmedWin = priorState?.confirmedWin === true
    || isFinalCheckCardWin(checkResult);
  const missedWinActive = confirmedWin
    ? false
    : (
      priorState?.missedWinActive === true
      || isCheckCardMissedWin(checkResult)
    );

  return {
    cartelaNo: priorState?.cartelaNo ?? null,
    winningCells: mergeWinningCells(
      priorState?.winningCells ?? [],
      priorProgress?.winningCells ?? [],
      checkResult?.winningCells ?? [],
    ),
    completedLinesRecorded: Math.max(
      Number(priorState?.completedLinesRecorded ?? 0),
      completedLines,
    ),
    requiredLines,
    completedLinesAtMiss: Math.max(
      Number(priorState?.completedLinesAtMiss ?? 0),
      missedWinActive ? completedLines : 0,
    ),
    linesAtLastEvaluation: completedLines,
    missedWinActive,
    confirmedWin,
  };
}

export function isCheckCardNotWinResult(
  checkResult,
  priorProgress = null,
  priorMiss = null,
) {
  if (
    !checkResult
    || isCheckCardCelebrationWin(checkResult, priorMiss)
    || isCheckCardMissedWin(checkResult, priorMiss)
    || hasEverCompletedValidWinningLine(checkResult, priorMiss)
  ) {
    return false;
  }

  const reason = checkResult.reason;
  if (
    reason === 'cartela-not-found'
    || reason === 'invalid-grid'
    || reason === 'invalid-input'
  ) {
    return false;
  }

  const requiredLines = resolveClosedValue(
    checkResult.requiredLines,
    checkResult.closed,
  );
  const completedLines = Number(checkResult.completedLines ?? 0);

  if (completedLines >= requiredLines) {
    return false;
  }

  if (priorProgress && completedLines > 0) {
    return false;
  }

  return true;
}

export function isCheckCardExpiredMessage(
  checkResult,
  priorProgress = null,
  priorMiss = null,
) {
  return isCheckCardMissedWin(checkResult, priorMiss);
}

export function snapshotCheckCardProgress(
  cartelaNo,
  checkResult,
  callCount,
  priorProgress = null,
) {
  if (!cartelaNo || !checkResult || isFinalCheckCardWin(checkResult)) {
    return null;
  }

  const completedLines = Number(checkResult.completedLines ?? 0);
  const requiredLines = resolveClosedValue(
    checkResult.requiredLines,
    checkResult.closed,
  );

  if (
    completedLines > 0
    && completedLines < requiredLines
    && (checkResult.progress === true || checkResult.reason === 'progress')
  ) {
    return {
      cartelaNo: String(cartelaNo).trim(),
      completedLines,
      callCount: Number(callCount) || 0,
      winningCells: mergeWinningCells(
        priorProgress?.winningCells ?? [],
        checkResult.winningCells ?? [],
      ),
    };
  }

  return null;
}

export function resolveCheckCardMessage({
  cartFound,
  checkResult,
  isPurchased,
  priorProgress = null,
  priorMiss = null,
}) {
  if (!cartFound || !isPurchased) {
    return CHECK_CARD_MESSAGES.notFound;
  }

  if (checkResult?.reason === 'cartela-not-found') {
    return CHECK_CARD_MESSAGES.notFound;
  }

  if (isCheckCardCelebrationWin(checkResult, priorMiss)) {
    return CHECK_CARD_MESSAGES.winner;
  }

  if (
    isCheckCardMissedWin(checkResult, priorMiss)
    || hasEverCompletedValidWinningLine(checkResult, priorMiss)
  ) {
    return CHECK_CARD_MESSAGES.expired;
  }

  return CHECK_CARD_MESSAGES.notWinner;
}

export function resolveCheckCardStatusTone(message) {
  if (message === CHECK_CARD_MESSAGES.winner) {
    return 'winner';
  }

  if (message === CHECK_CARD_MESSAGES.notFound) {
    return 'not-found';
  }

  if (message === CHECK_CARD_MESSAGES.expired) {
    return 'expired';
  }

  return 'not-winner';
}

export function snapshotMissedClaim(cartelaNo, checkResult, priorProgress = null) {
  if (!cartelaNo || !checkResult) {
    return null;
  }

  if (!isCheckCardMissedWin(checkResult)) {
    return null;
  }

  const completedLinesAtMiss = Number(checkResult.completedLines ?? 0);
  const requiredLines = resolveClosedValue(
    checkResult.requiredLines,
    checkResult.closed,
  );

  if (completedLinesAtMiss < requiredLines) {
    return null;
  }

  return {
    cartelaNo: String(cartelaNo).trim(),
    completedLinesAtMiss,
    requiredLines,
    linesAtLastEvaluation: completedLinesAtMiss,
    winningCells: mergeWinningCells(
      priorProgress?.winningCells ?? [],
      checkResult.winningCells ?? [],
    ),
  };
}

export function updateMissedClaimEvaluation(missedClaim, checkResult) {
  if (!missedClaim || !checkResult) {
    return missedClaim;
  }

  const currentLines = Number(checkResult.completedLines ?? missedClaim.linesAtLastEvaluation ?? 0);

  return {
    ...missedClaim,
    linesAtLastEvaluation: currentLines,
    winningCells: mergeWinningCells(
      missedClaim.winningCells ?? [],
      checkResult.winningCells ?? [],
    ),
  };
}

export function resolveCheckCardWinningCells(
  checkResult,
  isPurchased,
  cartelaState = null,
  priorProgress = null,
  priorMiss = null,
) {
  if (!isPurchased || !checkResult) {
    return [];
  }

  const accumulated = accumulateCartelaLineHighlights(
    cartelaState,
    checkResult,
    priorProgress,
  ).winningCells ?? [];

  if (!isCheckCardCelebrationWin(checkResult, priorMiss)) {
    return accumulated;
  }

  // Win highlights must include every completed winning line from the same
  // validation snapshot, including multiple lines finished together.
  return mergeWinningCells(
    checkResult.winningCells ?? [],
    accumulated,
  );
}

export function isFinalCheckCardWin(checkResult) {
  if (!checkResult?.valid) {
    return false;
  }

  const completedLines = Number(checkResult.completedLines ?? 0);
  const requiredLines = resolveClosedValue(
    checkResult.requiredLines,
    checkResult.closed,
  );

  return completedLines >= requiredLines;
}

export function isRecoveryWinAfterMiss(checkResult, missedClaim = null) {
  if (!missedClaim || !checkResult) {
    return false;
  }

  const missedLines = Number(
    missedClaim.completedLinesAtMiss ?? missedClaim.completedLines ?? 0,
  );
  const requiredLines = resolveClosedValue(
    missedClaim.requiredLines,
    checkResult.requiredLines,
    checkResult.closed,
  );
  const currentLines = Number(checkResult.completedLines ?? 0);

  if (requiredLines <= 0) {
    return false;
  }

  // A genuine miss means the required lines were already reached earlier.
  if (missedLines < requiredLines) {
    return false;
  }

  // Recalculate the current total completed lines against the required lines.
  // A single ball can complete two or more lines at once, so never assume the
  // total only advances by one after the miss.
  return currentLines >= requiredLines;
}

export function isCheckCardCelebrationWin(checkResult, missedClaim = null) {
  return isFinalCheckCardWin(checkResult)
    || isRecoveryWinAfterMiss(checkResult, missedClaim);
}
