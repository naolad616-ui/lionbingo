import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import BingoSubHeader from '../components/bingo/BingoSubHeader';
import BingoCardGrid from '../components/bingo/BingoCardGrid';
import BingoControlBar from '../components/bingo/BingoControlBar';
import EnterCartelaModal from '../components/bingo/EnterCartelaModal';
import SelectCardWarningModal from '../components/bingo/SelectCardWarningModal';
import CartelaNumberCallout from '../components/bingo/CartelaNumberCallout';
import { useWinnerPrize } from '../hooks/useWinnerPrize';
import { fetchGameSetupSettings, saveGameSetupSettings } from '../services/api';
import { persistClosedValue, readStoredClosedValue, resolveClosedValue } from '../utils/closedRules';
import {
  persistBetAmount,
  readStoredBetAmount,
  resolveBetAmount,
  stepBetAmount,
} from '../utils/gameSetupSettings';

const TOTAL_CARDS = 150;

export default function Bingo() {
  const navigate = useNavigate();
  const [selectedCards, setSelectedCards] = useState(() => new Set());
  const [gameCount, setGameCount] = useState(() => resolveClosedValue(readStoredClosedValue()));
  const [betAmount, setBetAmount] = useState(() => resolveBetAmount(readStoredBetAmount()));
  const [setupHydrated, setSetupHydrated] = useState(false);
  const [enterCardOpen, setEnterCardOpen] = useState(false);
  const [playWarningOpen, setPlayWarningOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [cartelaCallout, setCartelaCallout] = useState(null);

  const showCartelaCallout = useCallback((cartelaNumber) => {
    setCartelaCallout({ number: cartelaNumber, token: `${cartelaNumber}-${performance.now()}` });
  }, []);

  const clearCartelaCallout = useCallback(() => {
    setCartelaCallout(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateSetup = async () => {
      const result = await fetchGameSetupSettings();
      if (cancelled) {
        return;
      }

      const closed = resolveClosedValue(
        result.ok ? result.closed : null,
        readStoredClosedValue(),
      );
      const bet = resolveBetAmount(
        result.ok ? result.betAmount : null,
        readStoredBetAmount(),
      );

      setGameCount(closed);
      setBetAmount(bet);
      persistClosedValue(closed);
      persistBetAmount(bet);
      setSetupHydrated(true);
    };

    void hydrateSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!setupHydrated) {
      return;
    }

    persistClosedValue(gameCount);
    persistBetAmount(betAmount);
    void saveGameSetupSettings({ closed: gameCount, betAmount });
  }, [betAmount, gameCount, setupHydrated]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      document.documentElement.classList.toggle('bingo-cartela-fullscreen', active);
    };

    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.documentElement.classList.remove('bingo-cartela-fullscreen');
    };
  }, []);
  const cardsSold = useMemo(() => selectedCards.size, [selectedCards]);
  const selectedCartelas = useMemo(
    () => [...selectedCards].sort((left, right) => left - right),
    [selectedCards],
  );

  useWinnerPrize({ betAmount, cardsSold, selectedCartelas, closed: gameCount, syncSales: true });

  const handleToggleCard = useCallback((number) => {
    const isSelecting = !selectedCards.has(number);
    // Fire callout first so visual feedback starts on the same click frame.
    if (isSelecting) {
      showCartelaCallout(number);
    }

    setSelectedCards((current) => {
      const next = new Set(current);
      if (next.has(number)) {
        next.delete(number);
      } else {
        next.add(number);
      }
      return next;
    });
  }, [selectedCards, showCartelaCallout]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const handleEnterCardConfirm = useCallback((cartelaNumber) => {
    const parsed = Number.parseInt(cartelaNumber, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > TOTAL_CARDS) return;
    if (selectedCards.has(parsed)) return;

    showCartelaCallout(parsed);
    setSelectedCards((current) => {
      const next = new Set(current);
      next.add(parsed);
      return next;
    });
  }, [selectedCards, showCartelaCallout]);

  const handleSyncPrevious = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  const handlePlay = useCallback(() => {
    if (selectedCards.size === 0) {
      setPlayWarningOpen(true);
      return;
    }

    persistClosedValue(gameCount);
    navigate('/caller', { state: { betAmount, cardsSold, selectedCartelas, closed: gameCount } });
  }, [navigate, betAmount, cardsSold, selectedCartelas, gameCount]);

  return (
    <div className="bingo-select-screen min-h-screen bg-lion-page">
      <Header />

      <main className="bingo-select-page mx-auto w-full max-w-[1400px] px-3 pt-4 pb-1 sm:px-4 sm:pt-5 sm:pb-1.5 md:px-6">
        <section aria-label="Bingo card selection" className="bingo-select-panel">
          <BingoSubHeader />
          <BingoCardGrid
            selectedCards={selectedCards}
            onToggleCard={handleToggleCard}
          />
          <BingoControlBar
            gameCount={gameCount}
            betAmount={betAmount}
            onGameDecrease={() => setGameCount((value) => Math.max(1, value - 1))}
            onGameIncrease={() => setGameCount((value) => value + 1)}
            onBetDecrease={() => setBetAmount((value) => stepBetAmount(value, -1))}
            onBetIncrease={() => setBetAmount((value) => stepBetAmount(value, 1))}
            onEnterCard={() => setEnterCardOpen(true)}
            onSyncPrevious={handleSyncPrevious}
            onPlay={handlePlay}
            isFullscreen={isFullscreen}
            onFullscreen={handleFullscreen}
          />
        </section>
      </main>

      <EnterCartelaModal
        open={enterCardOpen}
        onClose={() => setEnterCardOpen(false)}
        onConfirm={handleEnterCardConfirm}
      />

      <SelectCardWarningModal
        open={playWarningOpen}
        onClose={() => setPlayWarningOpen(false)}
      />

      <CartelaNumberCallout
        key={cartelaCallout?.token ?? 'idle'}
        number={cartelaCallout?.number ?? null}
        token={cartelaCallout?.token ?? null}
        onDone={clearCartelaCallout}
      />
    </div>
  );
}
