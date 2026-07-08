import { useCallback, useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import SalesDailySummary from '../components/sales/SalesDailySummary';
import SalesSubHeader from '../components/sales/SalesSubHeader';
import SalesTableToolbar from '../components/sales/SalesTableToolbar';
import SalesTable from '../components/sales/SalesTable';
import useGameSalesHistory from '../hooks/useGameSalesHistory';

function getTodayDateString() {
  return new Date().toLocaleDateString('en-CA');
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export default function Sales() {
  const today = getTodayDateString();
  const [period, setPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(today);
  const [appliedPeriod, setAppliedPeriod] = useState('day');
  const [appliedDate, setAppliedDate] = useState(today);
  const sales = useGameSalesHistory({ period: appliedPeriod, date: appliedDate });

  const totalCollected = useMemo(
    () => sales.tableRows.reduce((sum, row) => sum + Number(row.collected || 0), 0),
    [sales.tableRows],
  );

  const handleFetch = useCallback(() => {
    setAppliedPeriod(period);
    setAppliedDate(selectedDate);
  }, [period, selectedDate]);

  return (
    <div className="min-h-screen bg-lion-page">
      <Header />

      <main className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6">
        <section
          aria-label="Sales history"
          className="overflow-hidden rounded-sm border border-gray-300 bg-white shadow-sm"
        >
          <SalesSubHeader period={appliedPeriod} />
          <SalesDailySummary summary={sales} period={appliedPeriod} />
          <SalesTableToolbar
            period={period}
            periodOptions={PERIOD_OPTIONS}
            onPeriodChange={setPeriod}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onFetch={handleFetch}
            totalCollected={totalCollected}
          />
          <SalesTable records={sales.tableRows} loading={sales.loading} period={appliedPeriod} />
        </section>
      </main>
    </div>
  );
}
