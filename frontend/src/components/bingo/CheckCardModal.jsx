import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CheckCardPreview from './CheckCardPreview';
import {
  fetchCartela,
  fetchGameState,
  fetchPatternSettings,
  checkCartelaInGame,
} from '../../services/api';
import getSocket from '../../services/socket';
import {
  CHECK_CARD_MESSAGES,
  isCartelaPurchased,
  isCheckCardCelebrationWin,
  isCheckCardExpiredMessage,
  mergeCalledNumbers,
  parseCartelaNumber,
  readStoredClosedValue,
  resolveCheckCardMessage,
  resolveCheckCardStatusTone,
  resolveCheckCardWinningCells,
  resolveClosedValue,
  snapshotCheckCardProgress,
  snapshotMissedClaim,
  updateMissedClaimEvaluation,
  validateCheckCardWin,
  isWinOpportunityPassed,
} from '../../utils/checkCard';
import { recordCheckCardWinner } from '../../utils/gameSalesTracking';
import {
  playCheckCardResultSounds,
  primeCheckCardSoundPlayback,
  resetCheckCardSoundState,
} from '../../utils/gameSound';

async function loadPatternSettings(gameData) {
  if (gameData?.patterns && typeof gameData.patterns === 'object') {
    return gameData.patterns;
  }

  const result = await fetchPatternSettings();
  return result.ok ? result.patterns : null;
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
  const [patternSettings, setPatternSettings] = useState(null);
  const [backendClosed, setBackendClosed] = useState(null);
  const lastCelebratedCallCountRef = useRef(0);
  const cardProgressRef = useRef(null);
  const missedClaimRef = useRef(null);
  const checkActionIdRef = useRef(0);

  const getPriorProgress = useCallback((trimmedCartelaNo) => {
    const stored = cardProgressRef.current;
    if (!stored || stored.cartelaNo !== String(trimmedCartelaNo).trim()) {
      return null;
    }

    return stored;
  }, []);

  const getPriorMiss = useCallback((trimmedCartelaNo) => {
    const stored = missedClaimRef.current;
    if (!stored || stored.cartelaNo !== String(trimmedCartelaNo).trim()) {
      return null;
    }

    return stored;
  }, []);

  const applyCheckOutcome = useCallback(({
    trimmedCartelaNo,
    nextCheckResult,
    purchased,
    callCount,
  }) => {
    const priorProgress = getPriorProgress(trimmedCartelaNo);
    const priorMiss = getPriorMiss(trimmedCartelaNo);
    const message = resolveCheckCardMessage({
      cartFound: true,
      checkResult: nextCheckResult,
      isPurchased: purchased,
      priorProgress,
      priorMiss,
    });

    setCheckResult(nextCheckResult);
    setStatusMessage(message);

    if (isCheckCardCelebrationWin(nextCheckResult, priorMiss)) {
      cardProgressRef.current = null;
      missedClaimRef.current = null;
      return;
    }

    const nextSnapshot = snapshotCheckCardProgress(
      trimmedCartelaNo,
      nextCheckResult,
      callCount,
    );

    if (nextSnapshot) {
      cardProgressRef.current = nextSnapshot;
      return;
    }

    if (priorMiss) {
      missedClaimRef.current = updateMissedClaimEvaluation(priorMiss, nextCheckResult);
      cardProgressRef.current = null;
      return;
    }

    if (message === CHECK_CARD_MESSAGES.expired) {
      const missedSnapshot = snapshotMissedClaim(
        trimmedCartelaNo,
        nextCheckResult,
        priorProgress,
      );

      if (missedSnapshot) {
        missedClaimRef.current = missedSnapshot;
      }

      cardProgressRef.current = null;
      return;
    }

    if (isCheckCardExpiredMessage(nextCheckResult, priorProgress, priorMiss)) {
      cardProgressRef.current = null;
    }
  }, [getPriorMiss, getPriorProgress]);

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
    () => isCartelaPurchased(cartelaNo, selectedCartelas),
    [cartelaNo, selectedCartelas],
  );

  const winningCells = useMemo(
    () => resolveCheckCardWinningCells(
      checkResult,
      isPurchased,
      getPriorMiss(cartelaNo.trim()),
    ),
    [checkResult, cartelaNo, getPriorMiss, isPurchased],
  );

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
    setCartelaNo('');
    setNumbers(null);
    setStatusMessage('');
    setIsLoading(false);
    setIsLocked(false);
    setCardLoaded(false);
    setBackendCalledNumbers([]);
    setSelectedCartelas([]);
    setCheckResult(null);
    setPatternSettings(null);
    setBackendClosed(null);
    lastCelebratedCallCountRef.current = 0;
    cardProgressRef.current = null;
    missedClaimRef.current = null;
    checkActionIdRef.current = 0;
    resetCheckCardSoundState();
  }, []);

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
      setPatternSettings(state.patterns);
    }
  }, []);

  const refreshBackendGameState = useCallback(async () => {
    const result = await fetchGameState();
    if (result.ok && result.data) {
      applyBackendGameState(result.data);

      if (!result.data.patterns) {
        const patternsResult = await fetchPatternSettings();
        if (patternsResult.ok && patternsResult.patterns) {
          setPatternSettings(patternsResult.patterns);
        }
      }
    }
  }, [applyBackendGameState]);

  const evaluateCard = useCallback(async (trimmedCartelaNo, checkActionId) => {
    const parsedCartelaNo = parseCartelaNumber(trimmedCartelaNo);
    if (!parsedCartelaNo) {
      setNumbers(null);
      setCardLoaded(false);
      setIsLocked(false);
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');

    const gameStateResult = await fetchGameState();
    const gameData = gameStateResult.ok ? gameStateResult.data : null;
    if (gameData) {
      applyBackendGameState(gameData);
    }

    const activePatterns = await loadPatternSettings(gameData);
    if (activePatterns) {
      setPatternSettings(activePatterns);
    }

    const activeSelectedCartelas = Array.isArray(gameData?.sales?.selectedCartelas)
      ? gameData.sales.selectedCartelas
      : selectedCartelas;
    const backendCalls = Array.isArray(gameData?.calledNumbers)
      ? gameData.calledNumbers
      : backendCalledNumbers;

    const cartelaResult = await fetchCartela(trimmedCartelaNo);
    if (!cartelaResult.ok) {
      setIsLoading(false);
      setNumbers(null);
      setCardLoaded(false);
      setIsLocked(false);
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      return;
    }

    const purchased = isCartelaPurchased(trimmedCartelaNo, activeSelectedCartelas);
    let nextCheckResult = null;

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

    setIsLoading(false);
    setNumbers(cartelaResult.data.numbers);
    setCardLoaded(true);
    setIsLocked(true);

    const mergedCalls = mergeCalledNumbers(callerCalledNumbers, backendCalls);
    const callCount = mergedCalls.length;
    const priorProgress = getPriorProgress(trimmedCartelaNo);
    const priorMiss = getPriorMiss(trimmedCartelaNo);
    const celebrationWin = isCheckCardCelebrationWin(nextCheckResult, priorMiss);
    const soundKey = celebrationWin
      ? `${trimmedCartelaNo}:${callCount}:${checkActionId}`
      : null;

    notifyWinOpportunityPassed(nextCheckResult);

    applyCheckOutcome({
      trimmedCartelaNo,
      nextCheckResult,
      purchased,
      callCount,
    });

    if (checkActionId !== checkActionIdRef.current) {
      return;
    }

    if (purchased && nextCheckResult) {
      await playCheckCardResultSounds({
        purchased,
        localCheckResult: nextCheckResult,
        priorProgress,
        priorMiss,
        soundKey: celebrationWin ? soundKey : null,
      });

      if (checkActionId !== checkActionIdRef.current) {
        return;
      }

      if (celebrationWin) {
        recordFinalWinner({
          parsedCartelaNo,
          nextCheckResult,
          mergedCalls,
          gameData,
          soundKey,
        });
      }

      void checkCartelaInGame(trimmedCartelaNo).then((backendCheck) => {
        console.log('[check-card-sound] Backend check (informational, post-play):', {
          ok: backendCheck.ok,
          data: backendCheck.ok ? backendCheck.data : null,
          error: backendCheck.ok ? null : backendCheck.error,
        });
      });
    }
  }, [
    applyBackendGameState,
    backendCalledNumbers,
    callerCalledNumbers,
    effectiveClosed,
    getPriorMiss,
    getPriorProgress,
    selectedCartelas,
    applyCheckOutcome,
    recordFinalWinner,
    notifyWinOpportunityPassed,
    winProgressionActive,
  ]);

  useEffect(() => {
    if (!open) {
      resetState();
      return undefined;
    }

    refreshBackendGameState();

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const pollId = window.setInterval(refreshBackendGameState, 2000);

    const socket = getSocket();
    const handleGameState = (state) => {
      applyBackendGameState(state);
    };

    const handleBallCalled = ({ state }) => {
      if (state) {
        applyBackendGameState(state);
      }
    };

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('game:state', handleGameState);
    socket.on('ball:called', handleBallCalled);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      window.clearInterval(pollId);
      socket.off('game:state', handleGameState);
      socket.off('ball:called', handleBallCalled);
    };
  }, [open, onClose, resetState, refreshBackendGameState, applyBackendGameState]);

  useEffect(() => {
    if (!open || !cardLoaded || !isLocked) return undefined;

    const trimmed = cartelaNo.trim();
    if (!trimmed) return undefined;

    let cancelled = false;

    const refreshStatus = async () => {
      const parsedCartelaNo = parseCartelaNumber(trimmed);
      if (!parsedCartelaNo) return;

      const purchased = isCartelaPurchased(trimmed, selectedCartelas);
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

      notifyWinOpportunityPassed(nextCheckResult);

      applyCheckOutcome({
        trimmedCartelaNo: trimmed,
        nextCheckResult,
        purchased,
        callCount: effectiveCalledNumbers.length,
      });
    };

    refreshStatus();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    cardLoaded,
    isLocked,
    cartelaNo,
    numbers,
    effectiveCalledNumbers,
    selectedCartelas,
    patternSettings,
    callerCalledNumbers,
    backendCalledNumbers,
    effectiveClosed,
    applyCheckOutcome,
    notifyWinOpportunityPassed,
    winProgressionActive,
  ]);

  const handleAction = useCallback(async () => {
    const trimmed = cartelaNo.trim();
    if (!trimmed) {
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      setNumbers(null);
      setCardLoaded(false);
      setIsLocked(false);
      return;
    }

    if (!isLocked) {
      primeCheckCardSoundPlayback();
    }

    const checkActionId = checkActionIdRef.current + 1;
    checkActionIdRef.current = checkActionId;
    await evaluateCard(trimmed, checkActionId);
  }, [cartelaNo, evaluateCard, isLocked]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    handleAction();
  }, [handleAction]);

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
            className="check-card-modal"
          >
            <div className="check-card-modal-header">
              <h2 id="check-card-title" className="check-card-modal-title">
                {displayTitle}
              </h2>
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
                    className="check-card-modal-input"
                    value={cartelaNo}
                    onChange={(event) => {
                      setCartelaNo(event.target.value);
                      if (cardLoaded) {
                        setCardLoaded(false);
                        setIsLocked(false);
                        setNumbers(null);
                        setStatusMessage('');
                        setCheckResult(null);
                        cardProgressRef.current = null;
                        missedClaimRef.current = null;
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="check-card-modal-submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'CHECKING...' : isLocked ? 'LOCK' : 'CHECK'}
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
