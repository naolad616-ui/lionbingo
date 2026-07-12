function resolveDateInputType(period) {
  if (period === 'month') return 'month';
  if (period === 'year') return 'number';
  return 'date';
}

function resolveDateInputValue(period, selectedDate) {
  if (period === 'month') {
    return String(selectedDate || '').slice(0, 7);
  }

  if (period === 'year') {
    return String(selectedDate || '').slice(0, 4);
  }

  return selectedDate;
}

function handleDateInputChange(period, value, onDateChange) {
  if (period === 'month') {
    onDateChange(`${value}-01`);
    return;
  }

  if (period === 'year') {
    onDateChange(`${value}-01-01`);
    return;
  }

  onDateChange(value);
}

export default function SalesTableToolbar({
  period,
  periodOptions,
  onPeriodChange,
  selectedDate,
  onDateChange,
  onFetch,
  totalCommission,
}) {
  const showDateInput = period !== 'all';
  const dateInputType = resolveDateInputType(period);

  return (
    <div className="flex flex-col gap-2 border-b border-gray-300 bg-[#f5f5f0] px-3 py-2 sm:flex-row sm:items-center sm:justify-end sm:px-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-sm font-semibold text-gray-900 sm:text-base">
          {Math.round(Number(totalCommission || 0)).toLocaleString()}-(ETB)
        </span>

        <select
          value={period}
          onChange={(event) => onPeriodChange(event.target.value)}
          className="rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-sm"
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {showDateInput ? (
          dateInputType === 'number' ? (
            <input
              type="number"
              min="2000"
              max="2100"
              value={resolveDateInputValue(period, selectedDate)}
              onChange={(event) => handleDateInputChange(period, event.target.value, onDateChange)}
              className="w-24 rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
          ) : (
            <input
              type={dateInputType}
              value={resolveDateInputValue(period, selectedDate)}
              onChange={(event) => handleDateInputChange(period, event.target.value, onDateChange)}
              className="rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
          )
        ) : null}

        <button
          type="button"
          onClick={onFetch}
          className="rounded-sm border border-gray-400 bg-[#e0e0e0] px-3 py-1.5 text-sm font-medium text-gray-900 transition hover:bg-[#d5d5d5]"
        >
          Fetch
        </button>
      </div>
    </div>
  );
}
