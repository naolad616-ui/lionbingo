import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CheckCardPreview from './CheckCardPreview';
import CheckCardWinnerConfetti from './CheckCardWinnerConfetti';
import {
  fetchGameState,
  fetchPatternSettings,
  checkCartelaInGame,
} from '../../services/api';
import getSocket from '../../services/socket';
import {
  CHECK_CARD_MESSAGES,
  accumulateCartelaLineHighlights,
  buildFinalCheckOutcome,
  isCartelaPurchased,
  mergeCalledNumbers,
  parseCartelaNumber,
  readStoredClosedValue,
  resolveCheckCardStatusTone,
  resolveClosedValue,
  snapshotCheckCardProgress,
  validateCheckCardWin,
  isWinOpportunityPassed,
} from '../../utils/checkCard';
import {
  getLockedCartelas,
  isCartelaLocked,
  lockCartela,
  readCartelaCheckState,
  unlockCartela,
  writeCartelaCheckState,
} from '../../utils/checkCardSession';
import { getCachedCartela } from '../../utils/cartelaCache';
import { recordCheckCardWinner } from '../../utils/gameSalesTracking';
import {
  cacheGamePatterns,
  getCachedGamePatterns,
} from '../../utils/gameSessionCache';
import { isBrowserOnline } from '../../utils/networkStatus';
import { loadSidebarPatternSettings } from '../../utils/sidebarSettingsStorage';
import {
  playCheckCardOutcomeSound,
  primeCheckCardSoundPlayback,
  resetCheckCardSoundState,
} from '../../utils/gameSound';

function resolveLocalPatternSettings(currentPatterns) {
  if (currentPatterns && typeof currentPatterns === 'object') {
    return currentPatterns;
  }

  const sessionPatterns = getCachedGamePatterns();
  if (sessionPatterns) {
    return sessionPatterns;
  }

  return loadSidebarPatternSettings();
}

function runCheckCardValidation({
  numbers,
  callerCalledNumbers,
  backendCalledNumbers,
  patternSettings,
  closed,
  progressionActive = false,
}) {
  return validateCheckCardWin({
    numbers,
    callerCalledNumbers,
    backendCalledNumbers,
    patternSettings,
    closed,
    progressionActive,
  });
}

export default function CheckCardModal({
  open,
  onClose,
  calledNumbers: callerCalledNumbers = [],
  selectedCartelas: selectedCartelasProp,
  closed: closedProp,
  winProgressionActive = false,
  onWinOpportunityPassed,
}) {
  const inputRef = useRef(null);
  const [cartelaNo, setCartelaNo] = useState('');
  const [numbers, setNumbers] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [cardLoaded, setCardLoaded] = useState(false);
  const [backendCalledNumbers, setBackendCalledNumbers] = useState([]);
  const [selectedCartelas, setSelectedCartelas] = useState([]);
  const [checkResult, setCheckResult] = useState(null);
  const [displayWinningCells, setDisplayWinningCells] = useState([]);
  const [patternSettings, setPatternSettings] = useState(null);
  const [backendClosed, setBackendClosed] = useState(null);
  const lastCelebratedCallCountRef = useRef(0);
  const cardProgressRef = useRef(null);
  const checkActionIdRef = useRef(0);
  const cartelaNoRef = useRef('');
  const manualCheckOutcomeRef = useRef(null);
  const [missedClaimRevision, setMissedClaimRevision] = useState(0);
  const [winnerConfettiKey, setWinnerConfettiKey] = useState(0);
  const previousStatusRef = useRef('');

  useEffect(() => {
    cartelaNoRef.current = cartelaNo;
  }, [cartelaNo]);

  const isCurrentCartelaCheck = useCallback((trimmedCartelaNo) => {
    return String(trimmedCartelaNo).trim() === String(cartelaNoRef.current).trim();
  }, []);

  const invalidateInFlightChecks = useCallback(() => {
    checkActionIdRef.current += 1;
  }, []);

  const clearTransientCheckState = useCallback(() => {
    setStatusMessage('');
    setCheckResult(null);
    setDisplayWinningCells([]);
    setNumbers(null);
    setCardLoaded(false);
    setIsLocked(false);
    cardProgressRef.current = null;
    previousStatusRef.current = '';
    manualCheckOutcomeRef.current = null;
    resetCheckCardSoundState();
  }, []);

  const getPriorProgress = useCallback((trimmedCartelaNo) => {
    const stored = cardProgressRef.current;
    if (!stored || stored.cartelaNo !== String(trimmedCartelaNo).trim()) {
      return null;
    }

    return stored;
  }, []);

  const getCartelaCheckState = useCallback((trimmedCartelaNo) => {
    return readCartelaCheckState(trimmedCartelaNo);
  }, []);

  const getActiveMissState = useCallback((trimmedCartelaNo) => {
    const state = readCartelaCheckState(trimmedCartelaNo);
    if (!state?.missedWinActive || state.confirmedWin) {
      return null;
    }

    return state;
  }, []);

  const persistLineHighlights = useCallback((
    trimmedCartelaNo,
    nextCheckResult,
    priorProgress,
  ) => {
    const priorState = readCartelaCheckState(trimmedCartelaNo);
    const nextState = accumulateCartelaLineHighlights(
      priorState,
      nextCheckResult,
      priorProgress,
    );

    writeCartelaCheckState(trimmedCartelaNo, {
      ...nextState,
      cartelaNo: trimmedCartelaNo,
    });
    setMissedClaimRevision((value) => value + 1);

    return nextState;
  }, []);

  const applyFinalCheckOutcome = useCallback((outcome, { suppressCelebration = false } = {}) => {
    if (!outcome || !isCurrentCartelaCheck(outcome.cartelaNo)) {
      return;
    }

    setCheckResult(outcome.checkResult);
    setStatusMessage(outcome.message);
    setDisplayWinningCells([...outcome.winningCells]);

    if (
      !suppressCelebration
      && outcome.message === CHECK_CARD_MESSAGES.winner
      && previousStatusRef.current !== CHECK_CARD_MESSAGES.winner
    ) {
      setWinnerConfettiKey((value) => value + 1);
    }
    previousStatusRef.current = outcome.message;

    persistLineHighlights(
      outcome.cartelaNo,
      outcome.checkResult,
      outcome.priorProgress,
    );

    if (outcome.celebrationWin) {
      cardProgressRef.current = null;
      return;
    }

    const nextSnapshot = snapshotCheckCardProgress(
      outcome.cartelaNo,
      outcome.checkResult,
      outcome.callCount,
      outcome.priorProgress,
    );

    if (nextSnapshot) {
      cardProgressRef.current = nextSnapshot;
      return;
    }

    if (outcome.message === CHECK_CARD_MESSAGES.expired) {
      cardProgressRef.current = null;
    }
  }, [
    isCurrentCartelaCheck,
    persistLineHighlights,
  ]);

  const effectiveClosed = useMemo(
    () => resolveClosedValue(closedProp, backendClosed, readStoredClosedValue()),
    [backendClosed, closedProp],
  );

  const notifyWinOpportunityPassed = useCallback((checkResult) => {
    if (
      winProgressionActive
      || !onWinOpportunityPassed
      || !isWinOpportunityPassed(checkResult, effectiveClosed)
    ) {
      return;
    }

    onWinOpportunityPassed();
  }, [effectiveClosed, onWinOpportunityPassed, winProgressionActive]);

  const effectiveCalledNumbers = useMemo(
    () => mergeCalledNumbers(callerCalledNumbers, backendCalledNumbers),
    [callerCalledNumbers, backendCalledNumbers],
  );

  const isPurchased = useMemo(
    () => isCartelaPurchased(
      cartelaNo,
      Array.isArray(selectedCartelasProp) ? selectedCartelasProp : selectedCartelas,
    ),
    [cartelaNo, selectedCartelas, selectedCartelasProp],
  );

  const winningCells = displayWinningCells;

  const recordFinalWinner = useCallback(({
    parsedCartelaNo,
    nextCheckResult,
    mergedCalls,
    gameData,
    soundKey,
  }) => {
    if (soundKey && soundKey === lastCelebratedCallCountRef.current) {
      return false;
    }

    const lastCalled = mergedCalls.length > 0 ? mergedCalls[mergedCalls.length - 1] : null;

    recordCheckCardWinner({
      cartelaNumber: parsedCartelaNo,
      matchedPattern: nextCheckResult.matchedPattern ?? null,
      finalWinningNumber: lastCalled,
      calledCount: mergedCalls.length,
      prize: gameData?.prize ?? null,
    });

    if (soundKey) {
      lastCelebratedCallCountRef.current = soundKey;
    }

    return true;
  }, []);

  const resetState = useCallback(() => {
    invalidateInFlightChecks();
    setCartelaNo('');
    cartelaNoRef.current = '';
    clearTransientCheckState();
    setIsLoading(false);
    setBackendCalledNumbers([]);
    setSelectedCartelas([]);
    setPatternSettings(null);
    setBackendClosed(null);
    lastCelebratedCallCountRef.current = 0;
    setMissedClaimRevision(0);
    setWinnerConfettiKey(0);
  }, [clearTransientCheckState, invalidateInFlightChecks]);

  const applyBackendGameState = useCallback((state) => {
    if (Array.isArray(state?.calledNumbers)) {
      setBackendCalledNumbers(state.calledNumbers);
    }

    setSelectedCartelas(
      Array.isArray(state?.sales?.selectedCartelas) ? state.sales.selectedCartelas : [],
    );

    if (state?.sales?.closed != null) {
      setBackendClosed(state.sales.closed);
    }

    if (state?.patterns && typeof state.patterns === 'object') {
      cacheGamePatterns(state.patterns);
      setPatternSettings(state.patterns);
    }
  }, []);

  const refreshBackendGameState = useCallback(async () => {
    if (!isBrowserOnline()) {
      setPatternSettings((current) => resolveLocalPatternSettings(current));
      return;
    }

    const result = await fetchGameState();
    if (result.ok && result.data) {
      applyBackendGameState(result.data);

      if (!result.data.patterns) {
        const patternsResult = await fetchPatternSettings();
        if (patternsResult.ok && patternsResult.patterns) {
          cacheGamePatterns(patternsResult.patterns);
          setPatternSettings(patternsResult.patterns);
        }
      }

      return;
    }

    // Fallback: warm patterns so the next CHECK can stay local.
    const patternsResult = await fetchPatternSettings();
    if (patternsResult.ok && patternsResult.patterns) {
      cacheGamePatterns(patternsResult.patterns);
      setPatternSettings((current) => current ?? patternsResult.patterns);
      return;
    }

    setPatternSettings((current) => resolveLocalPatternSettings(current));
  }, [applyBackendGameState]);

  const evaluateCard = useCallback(async (trimmedCartelaNo, checkActionId, options = {}) => {
    const { playSounds = true } = options;
    const parsedCartelaNo = parseCartelaNumber(trimmedCartelaNo);
    if (!parsedCartelaNo) {
      clearTransientCheckState();
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    setDisplayWinningCells([]);

    const profileStarted = performance.now();
    const mark = (name, startedAt = profileStarted) => ({
      name,
      ms: Number((performance.now() - startedAt).toFixed(2)),
    });

    // Prefer live caller/session data already in memory.
    const knownSelectedCartelas = Array.isArray(selectedCartelasProp)
      ? selectedCartelasProp
      : selectedCartelas;
    const online = isBrowserOnline();
    let activePatterns = patternSettings;
    let backendCalls = backendCalledNumbers;
    let gameData = null;

    // Offline: use locked/session/sidebar patterns — never wait on the network.
    if ((!activePatterns || typeof activePatterns !== 'object') && !online) {
      activePatterns = resolveLocalPatternSettings(null);
      if (activePatterns) {
        setPatternSettings(activePatterns);
      }
    }

    const needsPatterns = !activePatterns || typeof activePatterns !== 'object';

    // Fetch cartela (cached) in parallel with patterns/game state only when missing online.
    const cartelaFetchStarted = performance.now();
    const cartelaPromise = getCachedCartela(trimmedCartelaNo, { allowNetwork: online }).then((result) => ({
      result,
      fetchMs: performance.now() - cartelaFetchStarted,
      fromCache: Boolean(result.fromCache),
    }));
    const supportStarted = performance.now();
    const supportPromise = needsPatterns && online
      ? (async () => {
        const [gameStateResult, patternsResult] = await Promise.all([
          fetchGameState(),
          fetchPatternSettings(),
        ]);
        const data = gameStateResult.ok ? gameStateResult.data : null;
        if (data) {
          applyBackendGameState(data);
        }

        const patterns = (data?.patterns && typeof data.patterns === 'object')
          ? data.patterns
          : (patternsResult.ok ? patternsResult.patterns : null);

        if (patterns) {
          cacheGamePatterns(patterns);
        }

        return {
          data,
          patterns,
          backendCalls: Array.isArray(data?.calledNumbers) ? data.calledNumbers : null,
          supportMs: performance.now() - supportStarted,
        };
      })()
      : Promise.resolve(null);

    const [cartelaPacket, support] = await Promise.all([cartelaPromise, supportPromise]);

    if (checkActionId !== checkActionIdRef.current || !isCurrentCartelaCheck(trimmedCartelaNo)) {
      return;
    }

    const cartelaResult = cartelaPacket.result;

    if (support) {
      gameData = support.data;
      if (support.patterns) {
        activePatterns = support.patterns;
        setPatternSettings(support.patterns);
      }
      if (Array.isArray(support.backendCalls)) {
        backendCalls = support.backendCalls;
      }
    }

    // Last resort after a failed online fetch (or offline gap): local cached patterns.
    if (!activePatterns || typeof activePatterns !== 'object') {
      activePatterns = resolveLocalPatternSettings(null);
      if (activePatterns) {
        setPatternSettings(activePatterns);
      }
    }

    if (!cartelaResult.ok) {
      setIsLoading(false);
      clearTransientCheckState();
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      return;
    }

    const purchased = isCartelaPurchased(trimmedCartelaNo, knownSelectedCartelas);
    let nextCheckResult = null;

    const validationStarted = performance.now();
    if (purchased && activePatterns) {
      nextCheckResult = runCheckCardValidation({
        numbers: cartelaResult.data.numbers,
        callerCalledNumbers,
        backendCalledNumbers: backendCalls,
        patternSettings: activePatterns,
        closed: effectiveClosed,
        progressionActive: winProgressionActive,
      });
    }
    const validationMs = performance.now() - validationStarted;

    // Show validated result immediately — do not wait on sounds or backend echo.
    setIsLoading(false);
    setNumbers(cartelaResult.data.numbers);
    setCardLoaded(true);
    setIsLocked(isCartelaLocked(trimmedCartelaNo));

    console.log('[check-cartela-profile]', JSON.stringify({
      step: 'evaluateCard',
      cartelaNo: trimmedCartelaNo,
      needsPatterns,
      online,
      cartelaFromCache: cartelaPacket.fromCache,
      cartelaFetchMs: Number(cartelaPacket.fetchMs.toFixed(2)),
      supportMs: support ? Number(support.supportMs.toFixed(2)) : 0,
      validationMs: Number(validationMs.toFixed(2)),
      totalUntilResultMs: mark('totalUntilResult').ms,
    }));
    const mergedCalls = mergeCalledNumbers(callerCalledNumbers, backendCalls);
    const callCount = mergedCalls.length;
    const priorProgress = getPriorProgress(trimmedCartelaNo);
    const priorState = getCartelaCheckState(trimmedCartelaNo);
    const priorMissSnapshot = getActiveMissState(trimmedCartelaNo);
    const finalOutcome = buildFinalCheckOutcome({
      cartelaNo: trimmedCartelaNo,
      checkResult: nextCheckResult,
      isPurchased: purchased,
      priorProgress,
      priorMiss: priorMissSnapshot,
      priorState,
      callCount,
      checkActionId,
      playSounds,
    });

    notifyWinOpportunityPassed(nextCheckResult);

    if (playSounds) {
      manualCheckOutcomeRef.current = finalOutcome;
    }

    applyFinalCheckOutcome(finalOutcome, { suppressCelebration: !playSounds });

    if (checkActionId !== checkActionIdRef.current || !isCurrentCartelaCheck(trimmedCartelaNo)) {
      return;
    }

    // Keep session state fresh in the background (non-blocking) while online.
    if (online && !needsPatterns) {
      void refreshBackendGameState();
    }

    if (playSounds && purchased && nextCheckResult) {
      void playCheckCardOutcomeSound(finalOutcome).then(() => {
        if (checkActionId !== checkActionIdRef.current || !isCurrentCartelaCheck(trimmedCartelaNo)) {
          return;
        }

        if (finalOutcome.celebrationWin) {
          recordFinalWinner({
            parsedCartelaNo,
            nextCheckResult: finalOutcome.checkResult,
            mergedCalls,
            gameData,
            soundKey: finalOutcome.soundKey,
          });
        }

        if (!isBrowserOnline()) {
          return;
        }

        void checkCartelaInGame(trimmedCartelaNo).then((backendCheck) => {
          console.log('[check-card-sound] Backend check (informational, post-play):', {
            ok: backendCheck.ok,
            data: backendCheck.ok ? backendCheck.data : null,
            error: backendCheck.ok ? null : backendCheck.error,
          });
        });
      });
    }
  }, [
    applyBackendGameState,
    backendCalledNumbers,
    callerCalledNumbers,
    effectiveClosed,
    getActiveMissState,
    getCartelaCheckState,
    getPriorProgress,
    patternSettings,
    selectedCartelas,
    selectedCartelasProp,
    applyFinalCheckOutcome,
    recordFinalWinner,
    notifyWinOpportunityPassed,
    refreshBackendGameState,
    winProgressionActive,
    clearTransientCheckState,
    isCurrentCartelaCheck,
  ]);

  useEffect(() => {
    if (!open) {
      resetState();
      return undefined;
    }

    if (isBrowserOnline()) {
      void refreshBackendGameState();
    }

    const lockedCartelas = getLockedCartelas();
    const restoredCartela = lockedCartelas[0] ?? null;

    if (restoredCartela) {
      cartelaNoRef.current = restoredCartela;
      setCartelaNo(restoredCartela);
      const restoreActionId = checkActionIdRef.current + 1;
      checkActionIdRef.current = restoreActionId;
      void evaluateCard(restoredCartela, restoreActionId, { playSounds: false });
    }

    const frame = window.requestAnimationFrame(() => {
      if (!restoredCartela) {
        inputRef.current?.focus();
      }
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const pollId = window.setInterval(() => {
      if (isBrowserOnline()) {
        void refreshBackendGameState();
      }
    }, 2000);

    const handleOnline = () => {
      void refreshBackendGameState();
    };

    const socket = getSocket();
    const handleGameState = (state) => {
      applyBackendGameState(state);
    };

    const handleBallCalled = ({ state }) => {
      if (state) {
        applyBackendGameState(state);
      }
    };

    if (isBrowserOnline() && !socket.connected) {
      socket.connect();
    }

    socket.on('game:state', handleGameState);
    socket.on('ball:called', handleBallCalled);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('online', handleOnline);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('online', handleOnline);
      window.clearInterval(pollId);
      socket.off('game:state', handleGameState);
      socket.off('ball:called', handleBallCalled);
    };
    // Restore locked cartela only when the modal opens, not when evaluateCard identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, resetState, refreshBackendGameState, applyBackendGameState]);

  useEffect(() => {
    if (!open || !cardLoaded) return undefined;

    const trimmed = cartelaNo.trim();
    if (!trimmed) return undefined;

    let cancelled = false;

    const refreshStatus = async () => {
      const parsedCartelaNo = parseCartelaNumber(trimmed);
      if (!parsedCartelaNo) return;

      const purchased = isCartelaPurchased(
        trimmed,
        Array.isArray(selectedCartelasProp) ? selectedCartelasProp : selectedCartelas,
      );
      let nextCheckResult = null;

      if (purchased && patternSettings && numbers) {
        nextCheckResult = runCheckCardValidation({
          numbers,
          callerCalledNumbers,
          backendCalledNumbers,
          patternSettings,
          closed: effectiveClosed,
          progressionActive: winProgressionActive,
        });
      }

      if (cancelled) return;

      if (!isCurrentCartelaCheck(trimmed)) {
        return;
      }

      const lockedManualOutcome = manualCheckOutcomeRef.current;
      if (
        lockedManualOutcome
        && lockedManualOutcome.cartelaNo === trimmed
        && lockedManualOutcome.callCount === effectiveCalledNumbers.length
        && lockedManualOutcome.playSounds === true
      ) {
        return;
      }

      const refreshOutcome = buildFinalCheckOutcome({
        cartelaNo: trimmed,
        checkResult: nextCheckResult,
        isPurchased: purchased,
        priorProgress: getPriorProgress(trimmed),
        priorMiss: getActiveMissState(trimmed),
        priorState: getCartelaCheckState(trimmed),
        callCount: effectiveCalledNumbers.length,
        playSounds: false,
      });

      notifyWinOpportunityPassed(nextCheckResult);

      applyFinalCheckOutcome(refreshOutcome, { suppressCelebration: true });
    };

    refreshStatus();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    cardLoaded,
    cartelaNo,
    numbers,
    effectiveCalledNumbers,
    selectedCartelas,
    selectedCartelasProp,
    patternSettings,
    callerCalledNumbers,
    backendCalledNumbers,
    effectiveClosed,
    applyFinalCheckOutcome,
    getActiveMissState,
    getCartelaCheckState,
    getPriorProgress,
    notifyWinOpportunityPassed,
    isCurrentCartelaCheck,
    winProgressionActive,
  ]);

  const handleLockToggle = useCallback(() => {
    const trimmed = cartelaNo.trim();
    if (!trimmed || !cardLoaded) {
      return;
    }

    if (isLocked) {
      unlockCartela(trimmed);
      setIsLocked(false);
      return;
    }

    lockCartela(trimmed);
    setIsLocked(true);
  }, [cardLoaded, cartelaNo, isLocked]);

  const handleAction = useCallback(async () => {
    const trimmed = cartelaNo.trim();
    if (!trimmed) {
      invalidateInFlightChecks();
      clearTransientCheckState();
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      return;
    }

    if (isLocked) {
      handleLockToggle();
      return;
    }

    if (cardLoaded) {
      handleLockToggle();
      return;
    }

    primeCheckCardSoundPlayback();

    const checkActionId = checkActionIdRef.current + 1;
    checkActionIdRef.current = checkActionId;
    await evaluateCard(trimmed, checkActionId);
  }, [cardLoaded, cartelaNo, clearTransientCheckState, evaluateCard, handleLockToggle, invalidateInFlightChecks, isLocked]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    handleAction();
  }, [handleAction]);

  const actionButtonLabel = isLoading
    ? 'CHECKING...'
    : isLocked
      ? 'UNLOCK'
      : cardLoaded
        ? 'LOCK'
        : 'CHECK';

  const displayTitle = cardLoaded
    ? `Check Card No. - ${cartelaNo.trim()}`
    : 'Check Card';

  return (
    <AnimatePresence>
      {open && (
        <div className="check-card-modal-root" aria-hidden={!open}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="check-card-title"
            initial={{ opacity: 0, y: 12, scale: 0.75 }}
            animate={{ opacity: 1, y: 0, scale: 0.75 }}
            exit={{ opacity: 0, y: 12, scale: 0.75 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ transformOrigin: 'bottom left' }}
            className={`check-card-modal${isLocked ? ' check-card-modal--locked' : ''}`}
          >
            <CheckCardWinnerConfetti
              active={statusMessage === CHECK_CARD_MESSAGES.winner}
              celebrationKey={winnerConfettiKey}
            />
            <div className="check-card-modal-header">
              <h2 id="check-card-title" className="check-card-modal-title">
                {displayTitle}
              </h2>
              {isLocked ? (
                <span className="check-card-modal-locked-badge" aria-live="polite">
                  LOCKED
                </span>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close check card"
                className="check-card-modal-close"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="check-card-modal-body">
              <CheckCardPreview
                numbers={numbers}
                calledNumbers={effectiveCalledNumbers}
                cardLoaded={cardLoaded}
                isPurchased={isPurchased}
                winningCells={winningCells}
              />

              <div className="check-card-modal-side">
                <form className="check-card-modal-form" onSubmit={handleSubmit}>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    className={`check-card-modal-input${isLocked ? ' check-card-modal-input--locked' : ''}`}
                    value={cartelaNo}
                    readOnly={isLocked}
                    aria-readonly={isLocked}
                    onChange={(event) => {
                      if (isLocked) {
                        return;
                      }

                      const nextCartelaNo = event.target.value;
                      cartelaNoRef.current = nextCartelaNo;
                      setCartelaNo(nextCartelaNo);

                      if (cardLoaded) {
                        invalidateInFlightChecks();
                        clearTransientCheckState();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className={`check-card-modal-submit${
                      isLocked ? ' check-card-modal-submit--unlock' : ''
                    }${cardLoaded && !isLocked ? ' check-card-modal-submit--lock' : ''}`}
                    disabled={isLoading}
                    aria-pressed={isLocked}
                  >
                    {actionButtonLabel}
                  </button>
                </form>

                {statusMessage ? (
                  <p
                    className={`check-card-modal-status check-card-modal-status--${resolveCheckCardStatusTone(statusMessage)}`}
                    role="status"
                  >
                    {statusMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
