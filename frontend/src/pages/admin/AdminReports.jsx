import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  downloadTextFile,
  fetchAdminReports,
  recordsToCsv,
} from '../../services/adminApi';

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString()} ETB`;
}

function SummaryCard({ label, value }) {
  return (
    <div className="admin-card rounded-xl border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminReports() {
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await fetchAdminReports({
      period,
      date,
      from: from || undefined,
      to: to || undefined,
      search: search || undefined,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error || 'Failed to load reports.');
      return;
    }

    setData(result.data);
  }, [period, date, from, to, search]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const gameColumns = useMemo(() => ([
    { label: 'Started', value: (row) => row.gameStartedAt },
    { label: 'Ended', value: (row) => row.gameEndedAt },
    { label: 'Cards', value: (row) => row.cardsSold },
    { label: 'Collected', value: (row) => row.totalCollected },
    { label: 'Commission', value: (row) => row.commission },
    { label: 'Winner Payout', value: (row) => row.winnerPayout },
    { label: 'Cartela', value: (row) => row.cartelaNumber },
    { label: 'Pattern', value: (row) => row.matchedPattern },
    { label: 'Reason', value: (row) => row.completionReason },
    { label: 'Operator', value: (row) => row.operatorName },
  ]), []);

  const winnerColumns = useMemo(() => ([
    { label: 'Date', value: (row) => row.createdAt },
    { label: 'Cartela', value: (row) => row.cartelaNumber },
    { label: 'Cards Sold', value: (row) => row.cardsSold },
    { label: 'Total Pool', value: (row) => row.totalPool },
    { label: 'Winner Payout', value: (row) => row.winnerPayout },
    { label: 'House Profit', value: (row) => row.houseProfit },
    { label: 'Commission %', value: (row) => row.commissionRate },
    { label: 'Pattern', value: (row) => row.matchedPattern },
  ]), []);

  const exportCsv = (kind) => {
    if (!data) return;
    const records = kind === 'winners' ? data.winnerHistory : data.gameHistory;
    const columns = kind === 'winners' ? winnerColumns : gameColumns;
    const csv = recordsToCsv(records, columns);
    downloadTextFile(`lionbingo-${kind}-${period}.csv`, csv);
  };

  const exportExcel = (kind) => {
    if (!data) return;
    const records = kind === 'winners' ? data.winnerHistory : data.gameHistory;
    const columns = kind === 'winners' ? winnerColumns : gameColumns;
    const csv = recordsToCsv(records, columns);
    downloadTextFile(
      `lionbingo-${kind}-${period}.xls`,
      `\ufeff${csv}`,
      'application/vnd.ms-excel;charset=utf-8',
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        <p className="mt-1 text-sm text-slate-400">
          Sales, commission, winner history, and game history from live database records.
        </p>
      </div>

      <div className="admin-card grid gap-3 rounded-2xl border border-white/10 p-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs text-slate-400">
          Period
          <select
            className="admin-input mt-1 w-full"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="all">All Time</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Date
          <input
            type="date"
            className="admin-input mt-1 w-full"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="text-xs text-slate-400">
          From
          <input
            type="date"
            className="admin-input mt-1 w-full"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="text-xs text-slate-400">
          To
          <input
            type="date"
            className="admin-input mt-1 w-full"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="text-xs text-slate-400 xl:col-span-2">
          Search
          <input
            className="admin-input mt-1 w-full"
            placeholder="Operator, cartela, pattern..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="text-rose-400">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading reports...</p> : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Revenue" value={formatMoney(data.summary.totalRevenue)} />
            <SummaryCard label="Total Commission" value={formatMoney(data.summary.totalCommission)} />
            <SummaryCard label="Winner Payouts" value={formatMoney(data.summary.totalWinnerPayout)} />
            <SummaryCard label="Games" value={data.summary.games} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-btn-secondary" onClick={() => exportCsv('games')}>
              Export Games CSV
            </button>
            <button type="button" className="admin-btn-secondary" onClick={() => exportExcel('games')}>
              Export Games Excel
            </button>
            <button type="button" className="admin-btn-secondary" onClick={() => exportCsv('winners')}>
              Export Winners CSV
            </button>
            <button type="button" className="admin-btn-secondary" onClick={() => exportExcel('winners')}>
              Export Winners Excel
            </button>
          </div>

          <div className="admin-card overflow-hidden rounded-2xl border border-white/10">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="font-semibold text-white">Game History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full text-left text-sm">
                <thead>
                  <tr>
                    {gameColumns.map((column) => (
                      <th key={column.label}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.gameHistory.map((row) => (
                    <tr key={row.id || row.sessionId}>
                      {gameColumns.map((column) => (
                        <td key={column.label}>{column.value(row) ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card overflow-hidden rounded-2xl border border-white/10">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="font-semibold text-white">Winner History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table min-w-full text-left text-sm">
                <thead>
                  <tr>
                    {winnerColumns.map((column) => (
                      <th key={column.label}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.winnerHistory.map((row) => (
                    <tr key={row.id}>
                      {winnerColumns.map((column) => (
                        <td key={column.label}>{column.value(row) ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
