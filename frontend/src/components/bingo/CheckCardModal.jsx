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
  isCartelaProgressionActive,
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
import { getCachedCartela, peekCachedCartela } from '../../utils/cartelaCache';
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
import {
  createLatencyTrace,
  getSocketLatencySnapshot,
} from '../../utils/latencyTrace';

/** Optional support fetches must never hold CHECKING for multiple seconds. */
const SUPPORT_FETCH_TIMEOUT_MS = 500;

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

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ timedOut: true, value: null });
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({ timedOut: false, value });
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({ timedOut: false, value: null });
      },
    );
  });
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

  const getCartelaProgressionActive = useCallback((trimmedCartelaNo) => {
    return isCartelaProgressionActive(readCartelaCheckState(trimmedCartelaNo));
  }, []);

  const getCartelaCheckState = useCallback((trimmedCartelaNo) => {
    return readCartelaCheckState(trimmedCartelaNo);
  }, []);

  const getActiveMissState = useCallback((trimmedCartelaNo) => {
    const state = readCartelaCheckState(trimmedCartelaNo);
    if (!state?.missedWinActive) {
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
    const { playSounds = true, latencyTrace: incomingTrace = null } = options;
    const socket = getSocket();
    const latencyTrace = incomingTrace ?? createLatencyTrace('check-card-evaluate', {
      cartelaNo: trimmedCartelaNo,
      socketSnapshot: getSocketLatencySnapshot(socket),
    });

    const parsedCartelaNo = parseCartelaNumber(trimmedCartelaNo);
    if (!parsedCartelaNo) {
      clearTransientCheckState();
      setIsLoading(false);
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      latencyTrace.mark('ui_update_complete', { result: 'not-found' });
      latencyTrace.finish({ aborted: true, reason: 'invalid-cartela' });
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    setDisplayWinningCells([]);
    latencyTrace.mark('ui_loading_started');

    const profileStarted = performance.now();
    const mark = (name, startedAt = profileStarted) => ({
      name,
      ms: Number((performance.now() - startedAt).toFixed(2)),
    });

    let supportMs = 0;
    let supportTimedOut = false;
    let gameData = null;

    try {
      // Prefer live caller/session data already in memory.
      const knownSelectedCartelas = Array.isArray(selectedCartelasProp)
        ? selectedCartelasProp
        : selectedCartelas;
      const online = isBrowserOnline();

      // Always resolve patterns from React state → session cache → sidebar first.
      // Never block CHECKING on network when local patterns already exist.
      let activePatterns = resolveLocalPatternSettings(patternSettings);
      if (activePatterns && activePatterns !== patternSettings) {
        setPatternSettings(activePatterns);
        cacheGamePatterns(activePatterns);
      }

      let backendCalls = backendCalledNumbers;
      const hadLocalPatterns = Boolean(activePatterns && typeof activePatterns === 'object');

      latencyTrace.mark('evaluate_inputs_ready', {
        online,
        hadLocalPatterns,
        cartelaCached: peekCachedCartela(trimmedCartelaNo).ok,
        socketSnapshot: getSocketLatencySnapshot(socket),
      });

      // Cartela: use memory cache immediately; network only on miss.
      const cartelaFetchStarted = performance.now();
      latencyTrace.mark('cartela_fetch_start');
      const peekedCartela = peekCachedCartela(trimmedCartelaNo);
      let cartelaPacket;

      if (peekedCartela.ok) {
        cartelaPacket = {
          result: peekedCartela,
          fetchMs: 0,
          fromCache: true,
        };
        latencyTrace.mark('cartela_fetch_done', {
          fromCache: true,
          ok: true,
          fetchMs: 0,
        });
      } else {
        const result = await getCachedCartela(trimmedCartelaNo, { allowNetwork: online });
        const fetchMs = performance.now() - cartelaFetchStarted;
        cartelaPacket = {
          result,
          fetchMs,
          fromCache: Boolean(result.fromCache),
        };
        latencyTrace.mark('cartela_fetch_done', {
          fromCache: Boolean(result.fromCache),
          ok: result.ok,
          fetchMs: Number(fetchMs.toFixed(2)),
        });
      }

      if (checkActionId !== checkActionIdRef.current || !isCurrentCartelaCheck(trimmedCartelaNo)) {
        latencyTrace.mark('stale_action_aborted');
        latencyTrace.finish({ aborted: true, reason: 'stale-action' });
        return;
      }

      // Patterns still missing: optional support fetch with a hard timeout.
      // If local data is enough, skip waiting entirely and refresh in background.
      if (!hadLocalPatterns && online) {
        const supportStarted = performance.now();
        latencyTrace.mark('support_fetch_start', { timeoutMs: SUPPORT_FETCH_TIMEOUT_MS });

        const supportFetch = (async () => {
          const [gameStateResult, patternsResult] = await Promise.all([
            fetchGameState('default', latencyTrace),
            fetchPatternSettings(),
          ]);
          const data = gameStateResult.ok ? gameStateResult.data : null;
          const patterns = (data?.patterns && typeof data.patterns === 'object')
            ? data.patterns
            : (patternsResult.ok ? patternsResult.patterns : null);

          return {
            data,
            patterns,
            backendCalls: Array.isArray(data?.calledNumbers) ? data.calledNumbers : null,
          };
        })();

        const { timedOut, value: support } = await withTimeout(
          supportFetch,
          SUPPORT_FETCH_TIMEOUT_MS,
        );
        supportTimedOut = timedOut;
        supportMs = performance.now() - supportStarted;

        if (!timedOut && support) {
          gameData = support.data;
          if (support.data) {
            applyBackendGameState(support.data);
          }
          if (support.patterns) {
            activePatterns = support.patterns;
            cacheGamePatterns(support.patterns);
            setPatternSettings(support.patterns);
          }
          if (Array.isArray(support.backendCalls)) {
            backendCalls = support.backendCalls;
          }
        } else if (timedOut) {
          // Let the in-flight support request finish asynchronously without holding UI.
          void supportFetch.then((support) => {
            if (!support) return;
            if (support.data) {
              applyBackendGameState(support.data);
            }
            if (support.patterns) {
              cacheGamePatterns(support.patterns);
              setPatternSettings(support.patterns);
            }
          }).catch(() => {});
        }

        latencyTrace.mark('support_fetch_done', {
          supportMs: Number(supportMs.toFixed(2)),
          timedOut,
          hasPatterns: Boolean(activePatterns),
        });
      }

      if (!activePatterns || typeof activePatterns !== 'object') {
        activePatterns = resolveLocalPatternSettings(null);
        if (activePatterns) {
          setPatternSettings(activePatterns);
          cacheGamePatterns(activePatterns);
        }
      }

      if (checkActionId !== checkActionIdRef.current || !isCurrentCartelaCheck(trimmedCartelaNo)) {
        latencyTrace.mark('stale_action_aborted');
        latencyTrace.finish({ aborted: true, reason: 'stale-action-after-support' });
        return;
      }

      const cartelaResult = cartelaPacket.result;

      if (!cartelaResult.ok) {
        clearTransientCheckState();
        setStatusMessage(CHECK_CARD_MESSAGES.notFound);
        latencyTrace.mark('ui_update_complete', { result: 'not-found' });
        latencyTrace.finish({ aborted: true, reason: 'cartela-not-found' });
        return;
      }

      const purchased = isCartelaPurchased(trimmedCartelaNo, knownSelectedCartelas);
      let nextCheckResult = null;

      const validationStarted = performance.now();
      const priorProgress = getPriorProgress(trimmedCartelaNo);
      const priorState = getCartelaCheckState(trimmedCartelaNo);
      const priorMissSnapshot = getActiveMissState(trimmedCartelaNo);
      const progressionActive = getCartelaProgressionActive(trimmedCartelaNo);

      if (purchased && activePatterns) {
        nextCheckResult = runCheckCardValidation({
          numbers: cartelaResult.data.numbers,
          callerCalledNumbers,
          backendCalledNumbers: backendCalls,
          patternSettings: activePatterns,
          closed: effectiveClosed,
          progressionActive,
        });
      }
      const validationMs = performance.now() - validationStarted;
      latencyTrace.mark('validation_done', {
        validationMs: Number(validationMs.toFixed(2)),
        progressionActive,
      });

      // Show validated result immediately — do not wait on sounds or backend echo.
      setNumbers(cartelaResult.data.numbers);
      setCardLoaded(true);
      setIsLocked(isCartelaLocked(trimmedCartelaNo));

      console.log('[check-cartela-profile]', JSON.stringify({
        step: 'evaluateCard',
        cartelaNo: trimmedCartelaNo,
        hadLocalPatterns,
        supportTimedOut,
        online,
        cartelaFromCache: cartelaPacket.fromCache,
        cartelaFetchMs: Number(cartelaPacket.fetchMs.toFixed(2)),
        supportMs: Number(supportMs.toFixed(2)),
        validationMs: Number(validationMs.toFixed(2)),
        totalUntilResultMs: mark('totalUntilResult').ms,
      }));

      const mergedCalls = mergeCalledNumbers(callerCalledNumbers, backendCalls);
      const callCount = mergedCalls.length;
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
      latencyTrace.mark('ui_update_complete', {
        message: finalOutcome.message,
        soundAction: finalOutcome.soundAction,
      });

      if (checkActionId !== checkActionIdRef.current || !isCurrentCartelaCheck(trimmedCartelaNo)) {
        latencyTrace.finish({ aborted: true, reason: 'stale-after-ui' });
        return;
      }

      // Background refresh only when we validated from local patterns and did not
      // already kick off a support fetch for this CHECK.
      if (online && hadLocalPatterns) {
        void refreshBackendGameState();
      }

      if (playSounds && purchased && nextCheckResult) {
        const soundStarted = performance.now();
        latencyTrace.mark('sound_playback_start');
        void playCheckCardOutcomeSound(finalOutcome).then(() => {
          latencyTrace.mark('sound_playback_done', {
            soundMs: Number((performance.now() - soundStarted).toFixed(2)),
          });

          if (checkActionId !== checkActionIdRef.current || !isCurrentCartelaCheck(trimmedCartelaNo)) {
            latencyTrace.finish({ aborted: true, reason: 'stale-after-sound' });
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
            latencyTrace.finish({
              offline: true,
              socketSnapshot: getSocketLatencySnapshot(socket),
            });
            return;
          }

          latencyTrace.mark('backend_check_echo_start');
          void checkCartelaInGame(trimmedCartelaNo, 'default', latencyTrace).then((backendCheck) => {
            latencyTrace.mark('backend_check_echo_done', {
              ok: backendCheck.ok,
            });
            console.log('[check-card-sound] Backend check (informational, post-play):', {
              ok: backendCheck.ok,
              data: backendCheck.ok ? backendCheck.data : null,
              error: backendCheck.ok ? null : backendCheck.error,
            });
            latencyTrace.finish({
              socketSnapshot: getSocketLatencySnapshot(getSocket()),
              informationalBackendCheck: true,
            });
          });
        });
        return;
      }

      latencyTrace.finish({
        playSounds,
        socketSnapshot: getSocketLatencySnapshot(socket),
      });
    } catch (error) {
      latencyTrace.mark('evaluate_card_error', {
        message: error instanceof Error ? error.message : String(error),
      });
      latencyTrace.finish({ aborted: true, reason: 'exception' });
      if (isCurrentCartelaCheck(trimmedCartelaNo)) {
        clearTransientCheckState();
        setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    applyBackendGameState,
    backendCalledNumbers,
    callerCalledNumbers,
    effectiveClosed,
    getActiveMissState,
    getCartelaCheckState,
    getCartelaProgressionActive,
    getPriorProgress,
    patternSettings,
    selectedCartelas,
    selectedCartelasProp,
    applyFinalCheckOutcome,
    recordFinalWinner,
    notifyWinOpportunityPassed,
    refreshBackendGameState,
    clearTransientCheckState,
    isCurrentCartelaCheck,
  ]);

  useEffect(() => {
    if (!open) {
      resetState();
      return undefined;
    }

    // Seed patterns from session/sidebar immediately so the first CHECK never
    // blocks on network when local data already exists.
    setPatternSettings((current) => {
      const resolved = resolveLocalPatternSettings(current);
      if (resolved) {
        cacheGamePatterns(resolved);
      }
      return resolved ?? current;
    });

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
        const progressionActive = getCartelaProgressionActive(trimmed);
        nextCheckResult = runCheckCardValidation({
          numbers,
          callerCalledNumbers,
          backendCalledNumbers,
          patternSettings,
          closed: effectiveClosed,
          progressionActive,
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
    getCartelaProgressionActive,
    getPriorProgress,
    notifyWinOpportunityPassed,
    isCurrentCartelaCheck,
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
    const socketSnapshot = getSocketLatencySnapshot(getSocket());
    const latencyTrace = createLatencyTrace('check-card', {
      cartelaNo: trimmed,
      socketSnapshot,
    });
    latencyTrace.mark('button_click', {
      socketSnapshot,
      isLocked,
      cardLoaded,
    });

    if (!trimmed) {
      invalidateInFlightChecks();
      clearTransientCheckState();
      setStatusMessage(CHECK_CARD_MESSAGES.notFound);
      latencyTrace.mark('ui_update_complete', { result: 'not-found' });
      latencyTrace.finish({ aborted: true, reason: 'empty-input' });
      return;
    }

    if (isLocked) {
      handleLockToggle();
      latencyTrace.mark('ui_update_complete', { action: 'unlock' });
      latencyTrace.finish({ mode: 'unlock' });
      return;
    }

    if (cardLoaded) {
      handleLockToggle();
      latencyTrace.mark('ui_update_complete', { action: 'lock' });
      latencyTrace.finish({ mode: 'lock' });
      return;
    }

    primeCheckCardSoundPlayback();
    latencyTrace.mark('sound_prime_done');

    const checkActionId = checkActionIdRef.current + 1;
    checkActionIdRef.current = checkActionId;
    latencyTrace.mark('evaluate_card_start');
    await evaluateCard(trimmed, checkActionId, { latencyTrace });
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
