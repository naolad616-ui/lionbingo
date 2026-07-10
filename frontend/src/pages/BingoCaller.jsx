import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CheckCardModal from '../components/bingo/CheckCardModal';
import BingoDrumOverlay from '../components/bingo/BingoDrumOverlay';
import { useWinnerPrize } from '../hooks/useWinnerPrize';
import {
  playBallSound,
  playPauseSound,
  playShuffleSound,
  playWinThenPauseSounds,
  preloadGameSounds,
  stopGameSounds,
} from '../utils/gameSound';
import getSocket from '../services/socket';
import {
  fetchSoundSettings,
  lockGamePrize,
  resetGameState,
  shuffleGameState,
} from '../services/api';
import { DEFAULT_CALL_INTERVAL_MS } from '../utils/speedSettings';
import { readStoredClosedValue, resolveClosedValue } from '../utils/closedRules';
import { clearAllMissedClaims } from '../utils/checkCardSession';
import { readStoredBetAmount, resolveBetAmount } from '../utils/gameSetupSettings';

const BINGO_ROWS = [
  { letter: 'B', start: 1 },
  { letter: 'I', start: 16 },
  { letter: 'N', start: 31 },
  { letter: 'G', start: 46 },
  { letter: 'O', start: 61 },
];

const MIN_BALLS_FOR_CHECK = 3;

function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

function getBingoLetter(number) {
  if (number <= 15) return 'B';
  if (number <= 30) return 'I';
  if (number <= 45) return 'N';
  if (number <= 60) return 'G';
  return 'O';
}

function getBingoRangeKey(number) {
  if (number <= 15) return 'b';
  if (number <= 30) return 'i';
  if (number <= 45) return 'n';
  if (number <= 60) return 'g';
  return 'o';
}

function createShuffledDraw() {
  const numbers = Array.from({ length: 75 }, (_, index) => index + 1);
  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
  }
  return numbers;
}

function getCellState(number, calledNumbers) {
  if (calledNumbers.length === 0) return 'uncalled';
  const current = calledNumbers[calledNumbers.length - 1];
  if (number === current) return 'current';
  if (calledNumbers.includes(number)) return 'called';
  return 'uncalled';
}

export default function BingoCaller() {
  const location = useLocation();
  const navigate = useNavigate();
  const betAmount = resolveBetAmount(location.state?.betAmount, readStoredBetAmount());
  const cardsSold = location.state?.cardsSold ?? 0;
  const selectedCartelas = location.state?.selectedCartelas ?? [];
  const closed = useMemo(
    () => resolveClosedValue(location.state?.closed, readStoredClosedValue()),
    [location.state?.closed],
  );
  const { winnerPrize } = useWinnerPrize({
    betAmount,
    cardsSold,
    selectedCartelas,
    closed,
    syncSales: true,
  });

  const [drawOrder, setDrawOrder] = useState(() => createShuffledDraw());
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [winProgressionActive, setWinProgressionActive] = useState(false);
  const [isShuffleActive, setIsShuffleActive] = useState(false);
  const [shuffleSessionKey, setShuffleSessionKey] = useState(0);

  const drawIndexRef = useRef(0);
  const intervalRef = useRef(null);
  const previousCalledCountRef = useRef(0);
  const callIntervalMsRef = useRef(DEFAULT_CALL_INTERVAL_MS);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const shuffleHideTimerRef = useRef(null);

  const currentCall = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;
  const currentLetter = currentCall ? getBingoLetter(currentCall) : null;
  const currentRangeKey = currentCall ? getBingoRangeKey(currentCall) : null;

  const clearIntervalTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const drawNext = useCallback(() => {
    if (drawIndexRef.current >= drawOrder.length) {
      clearIntervalTimer();
      setIsRunning(false);
      setIsPaused(false);
      return;
    }

    const nextNumber = drawOrder[drawIndexRef.current];
    drawIndexRef.current += 1;
    setCalledNumbers((current) => [...current, nextNumber]);
  }, [clearIntervalTimer, drawOrder]);

  const refreshCallInterval = useCallback(async () => {
    const result = await fetchSoundSettings();
    if (result.ok && result.intervalMs) {
      callIntervalMsRef.current = result.intervalMs;
    }
    return callIntervalMsRef.current;
  }, []);

  const applyCallInterval = useCallback(
    (intervalMs) => {
      const parsed = Number(intervalMs);
      if (!Number.isFinite(parsed) || parsed <= 0) return;

      const previous = callIntervalMsRef.current;
      callIntervalMsRef.current = parsed;

      if (isRunningRef.current && !isPausedRef.current && parsed !== previous) {
        clearIntervalTimer();
        intervalRef.current = window.setInterval(drawNext, parsed);
      }
    },
    [clearIntervalTimer, drawNext],
  );

  const startCalling = useCallback(async () => {
    if (drawIndexRef.current >= drawOrder.length) return;

    await lockGamePrize({ betAmount, cardsSold, selectedCartelas, closed });
    await refreshCallInterval();

    clearIntervalTimer();
    setIsRunning(true);
    setIsPaused(false);

    if (calledNumbers.length === 0) {
      drawNext();
    }

    intervalRef.current = window.setInterval(drawNext, callIntervalMsRef.current);
  }, [
    betAmount,
    calledNumbers.length,
    cardsSold,
    closed,
    selectedCartelas,
    clearIntervalTimer,
    drawNext,
    drawOrder.length,
    refreshCallInterval,
  ]);

  const pauseCalling = useCallback(() => {
    if (!isRunning || isPaused) {
      return;
    }

    clearIntervalTimer();
    setIsPaused(true);
  }, [clearIntervalTimer, isRunning, isPaused]);

  const handleStart = async () => {
    if (isRunning && !isPaused) return;
    if (isPaused) {
      await refreshCallInterval();
      setIsPaused(false);
      intervalRef.current = window.setInterval(drawNext, callIntervalMsRef.current);
      return;
    }
    startCalling();
  };

  const handlePause = () => {
    if (!isRunning || isPaused) return;
    pauseCalling();
    playPauseSound();
  };

  const handleCheck = () => {
    if (calledNumbers.length < MIN_BALLS_FOR_CHECK) {
      return;
    }

    pauseCalling();
    playPauseSound();
    setCheckModalOpen(true);
  };

  const clearShuffleHideTimer = useCallback(() => {
    if (shuffleHideTimerRef.current) {
      window.clearTimeout(shuffleHideTimerRef.current);
      shuffleHideTimerRef.current = null;
    }
  }, []);

  const handleShuffle = useCallback(async () => {
    if (isRunning || isShuffleActive) return;

    setIsShuffleActive(true);
    setShuffleSessionKey((current) => current + 1);

    clearShuffleHideTimer();
    shuffleHideTimerRef.current = window.setTimeout(() => {
      setIsShuffleActive(false);
      shuffleHideTimerRef.current = null;
    }, 4000);

    stopGameSounds();
    void playShuffleSound();

    await shuffleGameState();
    setDrawOrder(createShuffledDraw());
    drawIndexRef.current = 0;
    setCalledNumbers([]);
    previousCalledCountRef.current = 0;
  }, [clearShuffleHideTimer, isRunning, isShuffleActive]);

  const handleWinOpportunityPassed = useCallback(() => {
    setWinProgressionActive(true);
  }, []);

  const handleReset = useCallback(async () => {
    const snapshot = {
      finalWinningNumber: calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null,
      calledCount: calledNumbers.length,
    };

    clearIntervalTimer();
    drawIndexRef.current = 0;
    setCalledNumbers([]);
    setIsRunning(false);
    setIsPaused(false);
    setCheckModalOpen(false);
    setWinProgressionActive(false);
    setIsShuffleActive(false);
    clearShuffleHideTimer();
    setDrawOrder(createShuffledDraw());
    previousCalledCountRef.current = 0;
    stopGameSounds();
    clearAllMissedClaims();
    await resetGameState('default', snapshot);
    navigate('/bingo', { replace: true });
  }, [calledNumbers, clearIntervalTimer, clearShuffleHideTimer, navigate]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    // Warm audio cache in the background so ball calls play from memory, not network.
    void preloadGameSounds();
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => () => {
    clearIntervalTimer();
    clearShuffleHideTimer();
  }, [clearIntervalTimer, clearShuffleHideTimer]);

  useEffect(() => {
    if (calledNumbers.length <= previousCalledCountRef.current) {
      previousCalledCountRef.current = calledNumbers.length;
      return;
    }

    const latestCall = calledNumbers[calledNumbers.length - 1];
    previousCalledCountRef.current = calledNumbers.length;
    playBallSound(latestCall);
  }, [calledNumbers]);

  useEffect(() => {
    const socket = getSocket();

    const handleValidatedWinner = () => {
      playWinThenPauseSounds();
    };

    const handleSettingsUpdated = (payload) => {
      if (payload?.intervalMs != null) {
        applyCallInterval(payload.intervalMs);
      }
    };

    const handleGameState = (state) => {
      if (state?.intervalMs != null) {
        applyCallInterval(state.intervalMs);
      }
    };

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join-room', { roomId: 'default' });
    socket.on('settings:updated', handleSettingsUpdated);
    socket.on('game:state', handleGameState);
    socket.on('bingo:validated', handleValidatedWinner);

    refreshCallInterval();

    return () => {
      socket.off('settings:updated', handleSettingsUpdated);
      socket.off('game:state', handleGameState);
      socket.off('bingo:validated', handleValidatedWinner);
    };
  }, [applyCallInterval, refreshCallInterval]);

  const shuffleDisabled = isRunning || isShuffleActive;
  const startDisabled = isRunning && !isPaused;
  const pauseDisabled = !isRunning || isPaused;
  const checkDisabled = calledNumbers.length < MIN_BALLS_FOR_CHECK;
  const resetDisabled = calledNumbers.length === 0 && !isRunning;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="bingo-caller-screen flex min-h-screen flex-col bg-[#1a4d82] p-2 font-sans sm:p-3"
    >
      <div className="bingo-caller-layout mx-auto min-h-0 w-full max-w-[1400px] flex-1">
        <div className="bingo-caller-current-box flex min-h-0 flex-col border border-black">
          <div className="bingo-caller-call-header shrink-0 bg-black text-center font-bold text-white">
            Current Call
          </div>
          <div className="bingo-caller-current-panel">
            {currentCall ? (
              <div className="bingo-caller-current-content">
                <div className="bingo-caller-ball-stage">
                  <div
                    className={`bingo-caller-ball bingo-caller-ball--${currentRangeKey}`}
                    aria-label={`Current call ${currentLetter} ${currentCall}`}
                  >
                    <div className={`bingo-caller-ball-inner bingo-caller-ball-inner--${currentRangeKey}`}>
                      <span className="bingo-caller-ball-letter">{currentLetter}</span>
                      <span className="bingo-caller-ball-number">{currentCall}</span>
                    </div>
                  </div>
                </div>
                <p className="bingo-caller-current-count">{calledNumbers.length} / 75</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bingo-caller-bet shrink-0 text-center font-bold text-white">
          BET:- {formatAmount(betAmount)}
        </div>

        <div className="bingo-caller-grid-wrap flex min-h-0 flex-col overflow-x-auto overflow-y-hidden">
          <BingoDrumOverlay active={isShuffleActive} sessionKey={shuffleSessionKey} />
          <div className="bingo-caller-grid">
            {BINGO_ROWS.map((row) => (
              <div key={row.letter} className="bingo-caller-row">
                <div className="bingo-caller-letter">{row.letter}</div>
                {Array.from({ length: 15 }, (_, index) => {
                  const number = row.start + index;
                  const state = getCellState(number, calledNumbers);
                  const isBlinkingLastCalled = number === currentCall;
                  const showOrangeRing = state === 'called';

                  return (
                    <div
                      key={`${row.letter}-${index}`}
                      className={`bingo-caller-cell bingo-caller-cell-${state}${
                        showOrangeRing ? ' bingo-caller-cell-orange-ring' : ''
                      }`}
                    >
                      <span
                        className={
                          isBlinkingLastCalled
                            ? 'bingo-caller-cell-number-blink'
                            : undefined
                        }
                      >
                        {number}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="bingo-caller-prize-wrap flex shrink-0 justify-end pr-1">
          <div className="bingo-caller-prize text-right">
            <p className="bingo-caller-prize-label font-bold tracking-wide text-white">
              WINNER PRIZE
            </p>
            <p className="bingo-caller-prize-value font-bold leading-tight text-white">
              {formatAmount(winnerPrize)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-[1400px] shrink-0">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={shuffleDisabled}
            onClick={handleShuffle}
            className={`bingo-caller-btn px-6 py-2 text-sm font-bold sm:px-8 sm:text-base ${
              isRunning ? 'bingo-caller-btn-shuffle' : 'bingo-caller-btn-active'
            }`}
          >
            SHUFFLE
          </button>
          <button
            type="button"
            disabled={startDisabled}
            onClick={handleStart}
            className={`bingo-caller-btn px-8 py-2 text-sm font-bold sm:px-10 sm:text-base ${
              startDisabled ? 'bingo-caller-btn-disabled' : 'bingo-caller-btn-active'
            }`}
          >
            START
          </button>
          <button
            type="button"
            disabled={pauseDisabled}
            onClick={handlePause}
            className={`bingo-caller-btn px-6 py-2 text-sm font-bold sm:px-8 sm:text-base ${
              pauseDisabled ? 'bingo-caller-btn-disabled' : 'bingo-caller-btn-pause-running'
            }`}
          >
            PAUSE
          </button>
          <button
            type="button"
            disabled={checkDisabled}
            onClick={handleCheck}
            title={
              checkDisabled
                ? 'Check Card is available after at least 3 balls have been called.'
                : undefined
            }
            className={`bingo-caller-btn px-6 py-2 text-sm font-bold sm:px-8 sm:text-base ${
              checkDisabled ? 'bingo-caller-btn-disabled' : 'bingo-caller-btn-active'
            }`}
          >
            CHECK
          </button>
          <button
            type="button"
            disabled={resetDisabled}
            onClick={handleReset}
            className={`bingo-caller-btn px-6 py-2 text-sm font-bold sm:px-8 sm:text-base ${
              resetDisabled ? 'bingo-caller-btn-disabled' : 'bingo-caller-btn-reset'
            }`}
          >
            RESET
          </button>
        </div>
        <button
          type="button"
          onClick={handleFullscreen}
          className="bingo-caller-btn bingo-caller-btn-fullscreen absolute right-0 top-0 px-4 py-2 text-sm font-bold text-white sm:px-5 sm:text-base"
        >
          Go Fullscreen
        </button>
      </div>

      <CheckCardModal
        open={checkModalOpen}
        onClose={() => setCheckModalOpen(false)}
        calledNumbers={calledNumbers}
        closed={closed}
        winProgressionActive={winProgressionActive}
        onWinOpportunityPassed={handleWinOpportunityPassed}
      />
    </motion.div>
  );
}
