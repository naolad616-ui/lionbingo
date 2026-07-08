export default function SaleDetailsModal({ record, onClose }) {
  if (!record) return null;

  const fields = [
    ['Player Name', record.playerName],
    ['Phone Number', record.phone || '-'],
    ['Card Number', record.cardNumber],
    ['Number of Cards', record.numberOfCards],
    ['Price Per Card', `${Number(record.pricePerCard).toFixed(2)} ETB`],
    ['Total Amount', `${Number(record.totalAmount).toFixed(2)} ETB`],
    ['Payment Status', record.paymentStatus],
    ['Commission', `${Number(record.commission).toFixed(2)} ETB`],
    ['Recorded By', record.by],
    ['Notes', record.notes || '-'],
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-details-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border border-gray-300 bg-white shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-gray-300 bg-[#e8e8e8] px-4 py-3">
          <h3 id="sale-details-title" className="text-sm font-bold uppercase text-gray-900">
            Sale Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="text-lg leading-none text-gray-700 hover:text-gray-900"
          >
            ×
          </button>
        </div>
        <dl className="divide-y divide-gray-200 px-4 py-2">
          {fields.map(([label, value]) => (
            <div key={label} className="grid grid-cols-2 gap-2 py-2 text-sm">
              <dt className="font-medium text-gray-700">{label}</dt>
              <dd className="text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
