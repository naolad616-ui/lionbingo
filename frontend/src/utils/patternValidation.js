import { resolveClosedValue } from './closedRules';

const GRID_SIZE = 5;
const CENTER = 2;

function isFreeCell(row, col) {
  return row === CENTER && col === CENTER;
}

function isMarked(grid, calledSet, row, col) {
  if (isFreeCell(row, col)) return true;
  const value = Number(grid[row][col]);
  return Number.isFinite(value) && value > 0 && calledSet.has(value);
}

function cellsMarked(grid, calledSet, coordinates) {
  return coordinates.every(([row, col]) => isMarked(grid, calledSet, row, col));
}

function includesCurrentBall(grid, coordinates, currentCall) {
  if (!currentCall) return true;

  return coordinates.some(([row, col]) => {
    if (isFreeCell(row, col)) return false;
    return Number(grid[row][col]) === currentCall;
  });
}

function rowCoordinates(row) {
  return Array.from({ length: GRID_SIZE }, (_, col) => [row, col]);
}

function columnCoordinates(col) {
  return Array.from({ length: GRID_SIZE }, (_, row) => [row, col]);
}

const PATTERN_DEFINITIONS = {
  anyHorizontal: {
    label: 'Any Horizontal',
    getCandidates: () => Array.from({ length: GRID_SIZE }, (_, row) => rowCoordinates(row)),
  },
  anyVertical: {
    label: 'Any Vertical',
    getCandidates: () => Array.from({ length: GRID_SIZE }, (_, col) => columnCoordinates(col)),
  },
  anyDiagonal: {
    label: 'Any Diagonal',
    getCandidates: () => [
      Array.from({ length: GRID_SIZE }, (_, index) => [index, index]),
      Array.from({ length: GRID_SIZE }, (_, index) => [index, GRID_SIZE - 1 - index]),
    ],
  },
  fourSingleCorner: {
    label: '4 Single Corner',
    getCandidates: () => [[[0, 0], [0, 4], [4, 0], [4, 4]]],
  },
  fourSingleMiddle: {
    label: '4 Single Middle',
    getCandidates: () => [[[0, 2], [2, 0], [2, 4], [4, 2]]],
  },
  fourMiddleCross: {
    label: '4 Middle Cross',
    getCandidates: () => {
      const cross = new Set();
      rowCoordinates(CENTER).forEach(([row, col]) => cross.add(`${row},${col}`));
      columnCoordinates(CENTER).forEach(([row, col]) => cross.add(`${row},${col}`));
      return [[...cross].map((key) => key.split(',').map(Number))];
    },
  },
};

function getEnabledPatterns(patternSettings) {
  return Object.entries(PATTERN_DEFINITIONS).filter(
    ([patternId]) => Boolean(patternSettings?.[patternId]),
  );
}

function buildCalledSet(calledNumbers) {
  return new Set(
    (calledNumbers ?? []).map((value) => Number(value)).filter((value) => Number.isFinite(value)),
  );
}

function calledSetWithoutCurrent(calledSet, currentCall) {
  const prior = new Set(calledSet);
  if (Number.isFinite(currentCall)) {
    prior.delete(currentCall);
  }
  return prior;
}

function isCompletedByCurrentBall(grid, calledSet, coordinates, currentCall) {
  if (!Number.isFinite(currentCall)) return false;
  if (!cellsMarked(grid, calledSet, coordinates)) return false;
  if (!includesCurrentBall(grid, coordinates, currentCall)) return false;

  const priorCalled = calledSetWithoutCurrent(calledSet, currentCall);
  return !cellsMarked(grid, priorCalled, coordinates);
}

function buildPatternResult(patternId, definition, coordinates) {
  return {
    matchedPattern: patternId,
    matchedPatternLabel: definition.label,
    winningCells: coordinates.map(([row, col]) => ({ row, col })),
  };
}

const LINE_PATTERN_IDS = ['anyHorizontal', 'anyVertical', 'anyDiagonal'];

function getAllLineDefinitions() {
  return LINE_PATTERN_IDS
    .map((patternId) => ({
      patternId,
      definition: PATTERN_DEFINITIONS[patternId],
    }))
    .filter((entry) => entry.definition);
}

function getCompletedLineCandidates(grid, calledSet) {
  const completed = [];

  for (const { patternId, definition } of getAllLineDefinitions()) {
    for (const coordinates of definition.getCandidates()) {
      if (cellsMarked(grid, calledSet, coordinates)) {
        completed.push({ patternId, definition, coordinates });
      }
    }
  }

  return completed;
}

function flattenWinningCells(completedLines) {
  const seen = new Set();
  const cells = [];

  for (const { coordinates } of completedLines) {
    for (const [row, col] of coordinates) {
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

function buildClosedLinesResult(completedLines, completedLinesCount, requiredLines) {
  const primary = completedLines[0];

  return {
    matchedPattern: primary?.patternId ?? 'closed-lines',
    matchedPatternLabel: primary?.definition?.label ?? `${requiredLines} Line${requiredLines === 1 ? '' : 's'}`,
    winningCells: flattenWinningCells(completedLines),
    completedLines: completedLinesCount,
    requiredLines,
  };
}

function buildProgressStage(linesNow, requiredLines) {
  return linesNow >= requiredLines - 1 ? 'almost' : 'alive';
}

function buildProgressResult({
  completedLines,
  newlyCompleted,
  completedNow = null,
  requiredLines,
}) {
  const allCompleted = completedNow ?? newlyCompleted;

  return {
    valid: false,
    progress: true,
    progressStage: buildProgressStage(completedLines, requiredLines),
    reason: 'progress',
    matchedPattern: newlyCompleted[0]?.patternId ?? 'closed-lines',
    matchedPatternLabel: newlyCompleted[0]?.definition?.label ?? 'Line Progress',
    winningCells: flattenWinningCells(allCompleted),
    completedLines,
    requiredLines,
    newlyCompletedLines: newlyCompleted.length,
  };
}

function buildInsufficientResult(completedLines, requiredLines, reason = 'insufficient-lines') {
  return {
    valid: false,
    matchedPattern: null,
    reason,
    completedLines,
    requiredLines,
  };
}

function buildWinResult(completedNow, linesNow, requiredLines) {
  if (linesNow < requiredLines) {
    return buildInsufficientResult(linesNow, requiredLines);
  }

  return {
    valid: true,
    progress: false,
    ...buildClosedLinesResult(completedNow, linesNow, requiredLines),
  };
}

function buildProgressionWinResult(newlyCompleted, linesNow) {
  const primary = newlyCompleted[0];

  return {
    valid: true,
    progress: false,
    reason: 'progression-win',
    matchedPattern: primary?.patternId ?? 'closed-lines',
    matchedPatternLabel: primary?.definition?.label ?? 'Line Progress',
    winningCells: flattenWinningCells(newlyCompleted),
    completedLines: linesNow,
    requiredLines: 1,
    newlyCompletedLines: newlyCompleted.length,
    progressionWin: true,
  };
}

export function validateCartelaWinWithClosed({
  grid,
  calledNumbers,
  patternSettings,
  currentCall = null,
  closed,
  progressionMode = false,
}) {
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
    return { valid: false, matchedPattern: null, reason: 'invalid-grid' };
  }

  const requiredLines = resolveClosedValue(closed);
  const calledSet = buildCalledSet(calledNumbers);
  const requireCurrentBall = Boolean(patternSettings?.checkCurrentBall);
  const activeCurrentCall = requireCurrentBall
    ? Number(currentCall ?? calledNumbers?.[calledNumbers.length - 1])
    : null;

  const completedNow = getCompletedLineCandidates(grid, calledSet);
  const linesNow = completedNow.length;

  if (!requireCurrentBall) {
    if (progressionMode) {
      if (linesNow >= 1) {
        return buildWinResult(completedNow, linesNow, 1);
      }

      return buildInsufficientResult(linesNow, 1);
    }

    if (linesNow >= requiredLines) {
      return buildWinResult(completedNow, linesNow, requiredLines);
    }

    if (linesNow > 0) {
      return buildProgressResult({
        completedLines: linesNow,
        newlyCompleted: completedNow,
        completedNow,
        requiredLines,
      });
    }

    return buildInsufficientResult(linesNow, requiredLines);
  }

  if (!Number.isFinite(activeCurrentCall)) {
    return buildInsufficientResult(linesNow, requiredLines, 'no-current-call');
  }

  const priorCalled = calledSetWithoutCurrent(calledSet, activeCurrentCall);
  const completedPrior = getCompletedLineCandidates(grid, priorCalled);
  const linesPrior = completedPrior.length;

  const newlyCompleted = completedNow.filter(({ coordinates }) =>
    isCompletedByCurrentBall(grid, calledSet, coordinates, activeCurrentCall),
  );

  if (progressionMode) {
    if (!Number.isFinite(activeCurrentCall)) {
      return buildInsufficientResult(linesNow, 1, 'no-current-call');
    }

    if (newlyCompleted.length > 0) {
      return buildProgressionWinResult(newlyCompleted, linesNow);
    }

    if (linesNow > 0) {
      return buildInsufficientResult(linesNow, 1, 'continue-playing');
    }

    return buildInsufficientResult(linesNow, 1);
  }

  const crossedThreshold = linesPrior < requiredLines && linesNow >= requiredLines;

  if (crossedThreshold && newlyCompleted.length > 0) {
    return buildWinResult(completedNow, linesNow, requiredLines);
  }

  // Initial ዝግ window already passed on a prior ball. Any NEW valid line
  // completed by the current ball is a recovery win opportunity.
  if (linesPrior >= requiredLines) {
    if (newlyCompleted.length > 0) {
      return buildProgressionWinResult(newlyCompleted, linesNow);
    }

    return {
      valid: false,
      expired: true,
      reason: 'pattern-expired',
      ...buildClosedLinesResult(completedNow, linesNow, requiredLines),
    };
  }

  if (linesNow >= requiredLines) {
    return {
      valid: false,
      expired: true,
      reason: 'pattern-expired',
      ...buildClosedLinesResult(completedNow, linesNow, requiredLines),
    };
  }

  if (newlyCompleted.length > 0) {
    return buildProgressResult({
      completedLines: linesNow,
      newlyCompleted,
      completedNow,
      requiredLines,
    });
  }

  if (linesNow > 0) {
    return buildInsufficientResult(linesNow, requiredLines, 'continue-playing');
  }

  return buildInsufficientResult(linesNow, requiredLines);
}

export function validateCartelaWin({ grid, calledNumbers, patternSettings, currentCall = null }) {
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
    return { valid: false, matchedPattern: null, reason: 'invalid-grid' };
  }

  const calledSet = buildCalledSet(calledNumbers);
  const requireCurrentBall = Boolean(patternSettings?.checkCurrentBall);
  const activeCurrentCall = requireCurrentBall
    ? Number(currentCall ?? calledNumbers?.[calledNumbers.length - 1])
    : null;

  if (!requireCurrentBall) {
    for (const [patternId, definition] of getEnabledPatterns(patternSettings)) {
      for (const coordinates of definition.getCandidates()) {
        if (!cellsMarked(grid, calledSet, coordinates)) continue;

        return {
          valid: true,
          ...buildPatternResult(patternId, definition, coordinates),
        };
      }
    }

    return { valid: false, matchedPattern: null, reason: 'no-pattern-matched' };
  }

  if (!Number.isFinite(activeCurrentCall)) {
    return { valid: false, matchedPattern: null, reason: 'no-current-call' };
  }

  let expiredCandidate = null;

  for (const [patternId, definition] of getEnabledPatterns(patternSettings)) {
    for (const coordinates of definition.getCandidates()) {
      if (!cellsMarked(grid, calledSet, coordinates)) continue;

      const patternResult = buildPatternResult(patternId, definition, coordinates);

      if (isCompletedByCurrentBall(grid, calledSet, coordinates, activeCurrentCall)) {
        return {
          valid: true,
          ...patternResult,
        };
      }

      if (!expiredCandidate) {
        expiredCandidate = patternResult;
      }
    }
  }

  if (expiredCandidate) {
    return {
      valid: false,
      expired: true,
      reason: 'pattern-expired',
      ...expiredCandidate,
    };
  }

  return { valid: false, matchedPattern: null, reason: 'no-pattern-matched' };
}
