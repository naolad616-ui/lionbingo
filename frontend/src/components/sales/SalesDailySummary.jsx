const PERIOD_SUMMARY_LABELS = {
  all: {
    games: 'Games (All Time)',
    cartelas: 'Cartelas Sold (All Time)',
    sales: 'Total Sales (All Time)',
    commission: 'Commission (All Time)',
    winner: 'Winner Prize (All Time)',
  },
  day: {
    games: 'Games Today',
    cartelas: 'Cartelas Sold',
    sales: 'Total Sales',
    commission: 'Commission',
    winner: 'Winner Prize',
  },
  month: {
    games: 'Games (Month)',
    cartelas: 'Cartelas Sold (Month)',
    sales: 'Total Sales (Month)',
    commission: 'Commission (Month)',
    winner: 'Winner Prize (Month)',
  },
  year: {
    games: 'Games (Year)',
    cartelas: 'Cartelas Sold (Year)',
    sales: 'Total Sales (Year)',
    commission: 'Commission (Year)',
    winner: 'Winner Prize (Year)',
  },
};

export default function SalesDailySummary({ summary, period = 'day' }) {
  const labels = PERIOD_SUMMARY_LABELS[period] || PERIOD_SUMMARY_LABELS.day;

  const items = [
    { label: labels.games, value: summary.gamesPlayed },
    { label: labels.cartelas, value: summary.totalCartelas },
    {
      label: labels.sales,
      value: `${Number(summary.totalSales || 0).toLocaleString()} ETB`,
    },
    {
      label: labels.commission,
      value: `${Number(summary.totalCommission || 0).toLocaleString()} ETB`,
    },
    {
      label: labels.winner,
      value: `${Number(summary.totalWinnerPrize || 0).toLocaleString()} ETB`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-gray-300 bg-[#f5f5f0] px-3 py-2 sm:grid-cols-3 lg:grid-cols-5 sm:px-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-600 sm:text-xs">
            {item.label}
          </p>
          <p className="truncate text-sm font-bold text-gray-900 sm:text-base">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
