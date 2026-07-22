import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHECK_CARD_MESSAGES,
  accumulateCartelaLineHighlights,
  buildFinalCheckOutcome,
  isCartelaProgressionActive,
  validateCheckCardWin,
} from './checkCard.js';

const REQUIRED_LINES = 2;
const PATTERN_SETTINGS = {
  checkCurrentBall: true,
  anyHorizontal: true,
  anyVertical: true,
  anyDiagonal: false,
};

function getActiveMissState(state) {
  if (!state?.missedWinActive) {
    return null;
  }

  return state;
}

function runCheck(cartelaNo, priorState, checkResult, options = {}) {
  const {
    playSounds = true,
    callCount = 1,
    checkActionId = 1,
  } = options;
  const priorMiss = getActiveMissState(priorState);
  const outcome = buildFinalCheckOutcome({
    cartelaNo,
    checkResult,
    isPurchased: true,
    priorMiss,
    priorState,
    callCount,
    checkActionId,
    playSounds,
  });
  const nextState = accumulateCartelaLineHighlights(priorState, checkResult, null);

  return {
    outcome,
    nextState: {
      ...nextState,
      cartelaNo,
      requiredLines: REQUIRED_LINES,
    },
  };
}

function progressionWinResult(completedLines) {
  return {
    valid: true,
    progress: false,
    progressionWin: true,
    reason: 'progression-win',
    completedLines,
    requiredLines: 1,
    matchedPattern: 'anyHorizontal',
  };
}

function progressionExpiredResult(completedLines) {
  return {
    valid: false,
    expired: true,
    reason: 'pattern-expired',
    completedLines,
    requiredLines: 1,
  };
}

function initialWinResult(completedLines = REQUIRED_LINES) {
  return {
    valid: true,
    progress: false,
    completedLines,
    requiredLines: REQUIRED_LINES,
    matchedPattern: 'anyHorizontal',
  };
}

function missedOpportunityResult(completedLines) {
  return {
    valid: false,
    expired: true,
    reason: 'pattern-expired',
    completedLines,
    requiredLines: REQUIRED_LINES,
  };
}

function notEnoughLinesResult(completedLines = 1) {
  return {
    valid: false,
    progress: true,
    reason: 'progress',
    completedLines,
    requiredLines: REQUIRED_LINES,
  };
}

function expectWinner(result, label) {
  assert.equal(
    result.outcome.message,
    CHECK_CARD_MESSAGES.winner,
    `${label}: expected Winner message`,
  );
  assert.equal(result.outcome.soundAction, 'win', `${label}: expected Win sound action`);
  assert.equal(result.outcome.celebrationWin, true, `${label}: expected celebration win flag`);
}

function expectMissed(result, label) {
  assert.equal(
    result.outcome.message,
    CHECK_CARD_MESSAGES.expired,
    `${label}: expected Missed/Expired message`,
  );
  assert.equal(result.outcome.soundAction, 'not-win', `${label}: expected not-Win sound action`);
}

function expectNotWinner(result, label) {
  assert.equal(
    result.outcome.message,
    CHECK_CARD_MESSAGES.notWinner,
    `${label}: expected Not Winner message`,
  );
}

function validateWithGrid({
  grid,
  calledNumbers,
  currentCall,
  closed = REQUIRED_LINES,
  priorState = null,
}) {
  return validateCheckCardWin({
    numbers: grid,
    callerCalledNumbers: calledNumbers,
    patternSettings: PATTERN_SETTINGS,
    closed,
    progressionActive: isCartelaProgressionActive(priorState),
  });
}

const TWO_LINE_GRID = [
  [1, 2, 3, 4, 5],
  [10, 11, 12, 13, 14],
  [20, 21, 0, 22, 23],
  [30, 31, 32, 33, 34],
  [40, 41, 42, 43, 44],
];

describe('missed-win recovery rule', () => {
  it('2 lines → Winner (initial win)', () => {
    const result = runCheck('101', null, initialWinResult(2));
    expectWinner(result, 'initial win at 2 lines');
    assert.equal(result.nextState.confirmedWin, true);
    assert.equal(result.nextState.missedWinActive, false);
  });

  it('2 lines → Miss → 3 lines → Winner (first recovery)', () => {
    let state = null;

    const missAtTwo = runCheck('101', state, missedOpportunityResult(2));
    expectMissed(missAtTwo, 'miss at 2 lines');
    state = missAtTwo.nextState;
    assert.equal(state.missedWinActive, true);
    assert.equal(state.linesAtLastEvaluation, 2);
    assert.equal(state.completedLinesAtMiss, 2);

    const winAtThree = runCheck('101', state, progressionWinResult(3));
    expectWinner(winAtThree, 'recovery win at 3 lines');
    state = winAtThree.nextState;
    assert.equal(state.confirmedWin, true);
    assert.equal(state.missedWinActive, false);
    assert.equal(state.progressionUnlocked, true);
  });

  it('2 → Miss → 3 → Miss → 4 → Winner (recovery baseline advances only on misses)', () => {
    let state = null;

    state = runCheck('101', state, missedOpportunityResult(2)).nextState;
    assert.equal(state.linesAtLastEvaluation, 2);

    // After the first miss, reaching 3 lines is a recovery win — not another miss.
    const winAtThree = runCheck('101', state, progressionWinResult(3));
    expectWinner(winAtThree, 'recovery at 3 after miss at 2');
    state = winAtThree.nextState;

    state = {
      ...state,
      confirmedWin: false,
      missedWinActive: true,
      progressionUnlocked: true,
      completedLinesAtMiss: REQUIRED_LINES,
      linesAtLastEvaluation: 3,
      requiredLines: REQUIRED_LINES,
    };

    const missAtThree = runCheck('101', state, progressionExpiredResult(3));
    expectMissed(missAtThree, 'miss again at 3 lines');
    state = missAtThree.nextState;
    assert.equal(state.linesAtLastEvaluation, 3, 'baseline stays at 3 when re-checking same line count');

    const winAtFour = runCheck('101', state, progressionWinResult(4));
    expectWinner(winAtFour, 'recovery at 4 after miss at 3');
  });

  it('2 → Miss → 3 → Miss → 4 → Miss → 5 → Winner (continued recovery chain)', () => {
    let state = runCheck('101', null, missedOpportunityResult(2)).nextState;

    state = runCheck('101', state, progressionWinResult(3)).nextState;
    state = {
      ...state,
      confirmedWin: false,
      missedWinActive: true,
      progressionUnlocked: true,
      completedLinesAtMiss: REQUIRED_LINES,
      linesAtLastEvaluation: 3,
      requiredLines: REQUIRED_LINES,
    };

    state = runCheck('101', state, progressionExpiredResult(3)).nextState;
    state = runCheck('101', state, progressionWinResult(4)).nextState;

    state = {
      ...state,
      confirmedWin: false,
      missedWinActive: true,
      progressionUnlocked: true,
      completedLinesAtMiss: REQUIRED_LINES,
      linesAtLastEvaluation: 4,
      requiredLines: REQUIRED_LINES,
    };

    state = runCheck('101', state, progressionExpiredResult(4)).nextState;

    const winAtFive = runCheck('101', state, progressionWinResult(5));
    expectWinner(winAtFive, 'recovery at 5 after miss at 4');
    assert.equal(winAtFive.nextState.confirmedWin, true);
    assert.equal(
      winAtFive.nextState.linesAtLastEvaluation,
      4,
      'recovery win does not advance baseline; it stays at the last missed-opportunity line count',
    );
  });

  it('does not advance recovery baseline on normal re-checks at the same line count', () => {
    let state = runCheck('101', null, missedOpportunityResult(2)).nextState;
    assert.equal(state.linesAtLastEvaluation, 2);

    const repeatCheck = runCheck('101', state, missedOpportunityResult(2));
    expectMissed(repeatCheck, 'repeat miss check at 2 lines');
    assert.equal(repeatCheck.nextState.linesAtLastEvaluation, 2);
  });

  it('does not advance recovery baseline on progress-only checks', () => {
    const result = runCheck('101', null, notEnoughLinesResult(1));
    expectNotWinner(result, 'one line progress');
    assert.equal(result.nextState.linesAtLastEvaluation, 0);
    assert.equal(result.nextState.missedWinActive, false);
  });

  it('after a win in progression, the first new valid line on the current ball wins immediately', () => {
    let state = runCheck('606', null, missedOpportunityResult(2)).nextState;
    state = runCheck('606', state, progressionWinResult(3)).nextState;

    assert.equal(state.progressionUnlocked, true);
    assert.equal(state.confirmedWin, true);

    const missAtThree = runCheck('606', state, progressionExpiredResult(3));
    expectMissed(missAtThree, 'miss after recovery win');
    state = missAtThree.nextState;
    assert.equal(state.progressionUnlocked, true);
    assert.equal(state.linesAtLastEvaluation, 3);

    const winAtFour = runCheck('606', state, progressionWinResult(4));
    expectWinner(winAtFour, 'first new valid line after win+miss');
  });

  it('after a successful recovery win, the same line count never wins again until a new line is completed', () => {
    let state = runCheck('101', null, missedOpportunityResult(2)).nextState;
    state = runCheck('101', state, progressionWinResult(3)).nextState;

    assert.equal(state.confirmedWin, true);

    const repeatAtThree = runCheck('101', state, progressionExpiredResult(3));
    assert.notEqual(repeatAtThree.outcome.message, CHECK_CARD_MESSAGES.winner);
    assert.notEqual(repeatAtThree.outcome.soundAction, 'win');
    assert.equal(repeatAtThree.nextState.confirmedWin, false);
  });

  it('keeps missed-win recovery state independent per cartela number', () => {
    let cartelaOne = runCheck('101', null, missedOpportunityResult(2)).nextState;
    let cartelaTwo = runCheck('202', null, notEnoughLinesResult(1)).nextState;

    assert.equal(cartelaOne.missedWinActive, true);
    assert.equal(cartelaOne.linesAtLastEvaluation, 2);
    assert.equal(cartelaTwo.missedWinActive, false);
    assert.equal(cartelaTwo.linesAtLastEvaluation, 0);

    const cartelaOneRecovery = runCheck('101', cartelaOne, progressionWinResult(3));
    expectWinner(cartelaOneRecovery, 'cartela 1 recovery');

    const cartelaTwoStillProgress = runCheck('202', cartelaTwo, notEnoughLinesResult(1));
    expectNotWinner(cartelaTwoStillProgress, 'cartela 2 unaffected by cartela 1 recovery');
    assert.equal(cartelaTwoStillProgress.nextState.missedWinActive, false);

    const cartelaTwoFirstMiss = runCheck('202', cartelaTwo, missedOpportunityResult(2));
    expectMissed(cartelaTwoFirstMiss, 'cartela 2 establishes its own miss state');
    assert.equal(cartelaTwoFirstMiss.nextState.missedWinActive, true);
    assert.equal(cartelaTwoFirstMiss.nextState.linesAtLastEvaluation, 2);
    assert.equal(cartelaOneRecovery.nextState.confirmedWin, true);
  });

  it('display and sound always come from the same final outcome object', () => {
    const scenarios = [
      runCheck('101', null, initialWinResult(2)),
      runCheck('101', null, missedOpportunityResult(2)),
      runCheck('101', null, notEnoughLinesResult(1)),
    ];

    for (const { outcome } of scenarios) {
      if (outcome.message === CHECK_CARD_MESSAGES.winner) {
        assert.equal(outcome.soundAction, 'win');
      } else if (outcome.message === CHECK_CARD_MESSAGES.expired) {
        assert.equal(outcome.soundAction, 'not-win');
      } else if (outcome.message === CHECK_CARD_MESSAGES.notWinner) {
        assert.notEqual(outcome.soundAction, 'win');
      }
    }
  });
});

describe('missed-win recovery with real validation', () => {
  it('one called number completing two lines after a miss still recovers correctly', () => {
    let state = runCheck('303', null, missedOpportunityResult(2)).nextState;
    assert.equal(state.linesAtLastEvaluation, 2);

    const callsBeforeCross = [2, 3, 4, 5, 10, 11, 12, 13, 14, 20, 30, 40];
    const crossingCall = 1;
    const calledNumbers = [...callsBeforeCross, crossingCall];

    const checkResult = validateWithGrid({
      grid: TWO_LINE_GRID,
      calledNumbers,
      currentCall: crossingCall,
      priorState: state,
    });

    assert.equal(checkResult.completedLines, 3, 'recovery requires one newly completed valid line');

    const recovery = runCheck('303', state, checkResult);
    expectWinner(recovery, 'recovery after one ball completes a new valid line');
    assert.equal(recovery.nextState.confirmedWin, true);
  });

  it('uses per-cartela progression instead of a global progression flag', () => {
    const cartelaOneMissed = runCheck('101', null, missedOpportunityResult(2)).nextState;
    assert.equal(isCartelaProgressionActive(cartelaOneMissed), true);
    assert.equal(isCartelaProgressionActive(null), false);

    const calledNumbers = [1, 2, 3, 4, 5, 10, 20, 30, 40];
    const cartelaTwoInitialWin = validateWithGrid({
      grid: TWO_LINE_GRID,
      calledNumbers,
      currentCall: 40,
      priorState: null,
    });

    assert.equal(
      cartelaTwoInitialWin.valid,
      true,
      'cartela without its own miss still wins at the full closed requirement',
    );
  });

  it('advances progression automatically after a missed opportunity without CHECK', () => {
    let state = null;

    const missAtTwo = runCheck('505', state, missedOpportunityResult(2));
    expectMissed(missAtTwo, 'miss recorded from validation snapshot');
    state = missAtTwo.nextState;
    assert.equal(isCartelaProgressionActive(state), true);

    const callsBeforeRecovery = [2, 3, 4, 5, 10, 11, 12, 13, 14, 20, 30, 40];
    const recoveryCall = 1;
    const checkResult = validateWithGrid({
      grid: TWO_LINE_GRID,
      calledNumbers: [...callsBeforeRecovery, recoveryCall],
      currentCall: recoveryCall,
      priorState: state,
    });

    const recovery = runCheck('505', state, checkResult);
    expectWinner(recovery, 'recovery without an extra CHECK press');
  });

  it('initial win at 2 completed lines via validation', () => {
    const calledNumbers = [1, 2, 3, 4, 5, 10, 20, 30, 40];
    const checkResult = validateWithGrid({
      grid: TWO_LINE_GRID,
      calledNumbers,
      currentCall: 40,
    });

    assert.equal(checkResult.completedLines, 2);
    assert.equal(checkResult.valid, true);

    const result = runCheck('404', null, checkResult);
    expectWinner(result, 'validated initial win');
  });
});
