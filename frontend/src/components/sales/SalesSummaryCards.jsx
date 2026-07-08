const DAILY_GAME_CARDS = [
  { id: 'games-played', label: 'Games Played Today', key: 'gamesPlayed', format: 'number' },
  { id: 'total-bets', label: 'Total Bets Today', key: 'totalBets', format: 'currency' },
  { id: 'total-wins', label: 'Total Wins Today', key: 'totalWins', format: 'currency' },
  { id: 'total-profit', label: 'Profit / Loss Today', key: 'totalProfit', format: 'currency' },
];

function formatValue(format, value) {
  if (format === 'number') {
    return Number(value || 0).toLocaleString();
  }

  const amount = Number(value || 0);
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

export default function SalesSummaryCards({ summary }) {
  return (
    <section aria-label="Daily game sales summary" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {DAILY_GAME_CARDS.map((card) => (
        <article
          key={card.id}
          className="rounded-sm border border-gray-300 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-600 sm:text-sm">
            {card.label}
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
            {formatValue(card.format, summary[card.key])}
          </p>
        </article>
      ))}
    </section>
  );
}
