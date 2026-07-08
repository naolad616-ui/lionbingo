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

export function isCheckCardNotWinResult(
  checkResult,
  priorProgress = null,
  priorMiss = null,
) {
  if (
    !checkResult
    || isCheckCardCelebrationWin(checkResult, priorMiss)
  ) {
    return false;
  }

  if (checkResult.expired === true) {
    return false;
  }

  if (isCheckCardExpiredMessage(checkResult, priorProgress, priorMiss)) {
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

  return true;
}

export function isCheckCardExpiredMessage(
  checkResult,
  priorProgress = null,
  priorMiss = null,
) {
  if (
    !checkResult
    || isFinalCheckCardWin(checkResult)
    || isRecoveryWinAfterMiss(checkResult, priorMiss)
  ) {
    return false;
  }

  if (priorMiss) {
    return true;
  }

  if (checkResult.expired === true) {
    return true;
  }

  if (!priorProgress) {
    return false;
  }

  const currentLines = Number(checkResult.completedLines ?? 0);
  const priorLines = Number(priorProgress.completedLines ?? 0);

  if (checkResult.progress === true && currentLines > priorLines) {
    return false;
  }

  if (checkResult.reason === 'continue-playing') {
    return true;
  }

  if (currentLines > 0 && currentLines <= priorLines) {
    return true;
  }

  return false;
}

export function snapshotCheckCardProgress(cartelaNo, checkResult, callCount) {
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

  if (isCheckCardExpiredMessage(checkResult, priorProgress, priorMiss)) {
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

  if (!isCheckCardExpiredMessage(checkResult, priorProgress)) {
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
  };
}

export function updateMissedClaimEvaluation(missedClaim, checkResult) {
  if (!missedClaim || !checkResult) {
    return missedClaim;
  }

  return {
    ...missedClaim,
    linesAtLastEvaluation: Number(checkResult.completedLines ?? missedClaim.linesAtLastEvaluation ?? 0),
  };
}

export function resolveCheckCardWinningCells(
  checkResult,
  isPurchased,
  priorMiss = null,
) {
  if (!isPurchased || !checkResult || !Array.isArray(checkResult.winningCells)) {
    return [];
  }

  if (
    checkResult.valid
    || checkResult.expired
    || checkResult.progress
    || isRecoveryWinAfterMiss(checkResult, priorMiss)
  ) {
    return checkResult.winningCells;
  }

  return [];
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
  const linesAtLastEvaluation = Number(
    missedClaim.linesAtLastEvaluation ?? missedLines,
  );

  if (missedLines < requiredLines) {
    return false;
  }

  if (currentLines !== missedLines + 1) {
    return false;
  }

  return currentLines > linesAtLastEvaluation;
}

export function isCheckCardCelebrationWin(checkResult, missedClaim = null) {
  return isFinalCheckCardWin(checkResult)
    || isRecoveryWinAfterMiss(checkResult, missedClaim);
}
