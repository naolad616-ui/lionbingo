import { SalesGridIcon } from './SalesIcons';

const PERIOD_LABELS = {
  all: 'All-Time Sales History',
  day: 'Daily Sales',
  month: 'Monthly Sales',
  year: 'Yearly Sales',
};

export default function SalesSubHeader({ period = 'day' }) {
  const title = PERIOD_LABELS[period] || PERIOD_LABELS.day;

  return (
    <div className="flex items-center gap-2 border-b border-gray-300 bg-[#e8e8e8] px-3 py-2 sm:px-4">
      <SalesGridIcon className="h-4 w-4 text-gray-700" />
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800 sm:text-[15px]">
        {title}
      </h2>
    </div>
  );
}
