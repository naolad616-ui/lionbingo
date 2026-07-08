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

export function validateCheckOrBingo(payload) {
  const { grid, calledNumbers, patternSettings, currentCall } = payload;
  return validateCartelaWin({ grid, calledNumbers, patternSettings, currentCall });
}
