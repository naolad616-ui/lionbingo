import { useCallback, useEffect, useState } from 'react';
import { fetchAdminDashboard } from '../../services/adminApi';
import { getSocket } from '../../services/socket';

function StatCard({ label, value, accent = 'amber' }) {
  const accents = {
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300',
    sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-300',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300',
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300',
    slate: 'from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-200',
  };

  return (
    <div className={`admin-card rounded-2xl border bg-gradient-to-br p-5 ${accents[accent]}`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString()} ETB`;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    const result = await fetchAdminDashboard();
    if (!result.ok) {
      setError(result.error || 'Failed to load dashboard.');
      return;
    }
    setError('');
    setData(result.data);
  }, []);

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 5000);

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join-room', { roomId: 'default' });

    const onState = () => {
      void loadDashboard();
    };
    const onPresence = (payload) => {
      setData((current) => (
        current
          ? { ...current, onlinePlayers: payload.onlinePlayers ?? current.onlinePlayers }
          : current
      ));
    };

    socket.on('game:state', onState);
    socket.on('presence:updated', onPresence);
    socket.on('game:configured', onState);
    socket.on('game:prize-locked', onState);

    return () => {
      window.clearInterval(interval);
      socket.off('game:state', onState);
      socket.off('presence:updated', onPresence);
      socket.off('game:configured', onState);
      socket.off('game:prize-locked', onState);
    };
  }, [loadDashboard]);

  if (error && !data) {
    return <p className="text-rose-400">{error}</p>;
  }

  if (!data) {
    return <p className="text-slate-400">Loading live dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">
          Live game metrics from the current Bingo room
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Online Players" value={data.onlinePlayers} accent="sky" />
        <StatCard label="Sold Cartelas" value={data.soldCartelas} accent="amber" />
        <StatCard label="Available Cartelas" value={data.availableCartelas} accent="violet" />
        <StatCard label="Game Status" value={data.gameStatus} accent="emerald" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Sales" value={formatMoney(data.totalSales)} accent="amber" />
        <StatCard label="Winner Prize" value={formatMoney(data.winnerPrize)} accent="emerald" />
        <StatCard label="House Commission" value={formatMoney(data.houseCommission)} accent="rose" />
      </div>

      <div className="admin-card grid gap-4 rounded-2xl border border-white/10 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Bet Amount</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatMoney(data.betAmount)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Commission Rate</p>
          <p className="mt-1 text-lg font-semibold text-white">{data.commissionRate}%</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Called Balls</p>
          <p className="mt-1 text-lg font-semibold text-white">{data.calledCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Current Call</p>
          <p className="mt-1 text-lg font-semibold text-white">{data.currentCall ?? '—'}</p>
        </div>
      </div>

      <div className="admin-card rounded-2xl border border-white/10 p-5">
        <h3 className="text-lg font-semibold text-white">Today&apos;s Summary</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Games</p>
            <p className="text-xl font-bold text-white">{data.daily.games}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Sales</p>
            <p className="text-xl font-bold text-white">{formatMoney(data.daily.totalSales)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Commission</p>
            <p className="text-xl font-bold text-white">{formatMoney(data.daily.totalCommission)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Winner Payouts</p>
            <p className="text-xl font-bold text-white">{formatMoney(data.daily.totalWinnerPayout)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
