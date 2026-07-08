function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const COLUMNS = [
  { key: 'index', label: '#' },
  { key: 'startedTime', label: 'Started Time' },
  { key: 'endedTime', label: 'Ended Time' },
  { key: 'shopName', label: 'Shop Name' },
  { key: 'onCall', label: 'On Call' },
  { key: 'finalWinningNumber', label: 'Win #' },
  { key: 'numberOfCards', label: 'No. Cards' },
  { key: 'pricePerCard', label: 'Price' },
  { key: 'collected', label: 'Collected' },
  { key: 'commission', label: 'Commission' },
  { key: 'by', label: 'By' },
];

function emptyMessage(period) {
  if (period === 'all') return 'No sales records found.';
  if (period === 'month') return 'No sales records for this month.';
  if (period === 'year') return 'No sales records for this year.';
  return 'No sales records for this date.';
}

export default function SalesTable({ records, loading = false, period = 'day' }) {
  const showInitialLoading = loading && records.length === 0;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full border-collapse text-center text-sm">
        <thead>
          <tr className="bg-[#ddd0b8]">
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className="border border-gray-300 px-2 py-2 font-bold text-gray-900"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showInitialLoading ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="border border-gray-300 bg-[#faf8f3] px-4 py-8 text-gray-600"
              >
                Loading sales history...
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="border border-gray-300 bg-[#faf8f3] px-4 py-8 text-gray-600"
              >
                {emptyMessage(period)}
              </td>
            </tr>
          ) : (
            records.map((record, index) => (
              <tr
                key={record.id}
                className={index % 2 === 0 ? 'bg-[#faf8f3]' : 'bg-[#f3f0e8]'}
              >
                <td className="border border-gray-300 px-2 py-2 text-gray-900">{index + 1}</td>
                <td className="border border-gray-300 px-2 py-2 text-left text-gray-900">
                  {formatDateTime(record.startedTime)}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-left text-gray-900">
                  {formatDateTime(record.endedTime)}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-left text-gray-900">
                  {record.shopName}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-gray-900">{record.onCall}</td>
                <td className="border border-gray-300 px-2 py-2 font-semibold text-gray-900">
                  {record.finalWinningNumber ?? '—'}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-gray-900">
                  {record.numberOfCards}
                </td>
                <td className="border border-gray-300 px-2 py-2 font-semibold text-[#1f8f3a]">
                  {Number(record.pricePerCard).toFixed(2)}
                </td>
                <td className="border border-gray-300 px-2 py-2 font-semibold text-[#1f8f3a]">
                  {Number(record.collected).toFixed(0)}
                </td>
                <td className="border border-gray-300 px-2 py-2 font-semibold text-[#1f8f3a]">
                  {Number(record.commission).toFixed(0)}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-left font-medium text-[#b87333]">
                  {record.by}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
