import { useEffect, useState } from 'react';
import { PAYMENT_STATUSES } from '../../utils/salesStorage';

const EMPTY_FORM = {
  playerName: '',
  phone: '',
  cardNumber: '',
  numberOfCards: '',
  pricePerCard: '',
  totalAmount: '',
  paymentStatus: 'Paid',
  notes: '',
};

export { EMPTY_FORM };

export default function SalesRecordForm({ initialValues, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initialValues });

  useEffect(() => {
    setForm({ ...EMPTY_FORM, ...initialValues });
  }, [initialValues]);

  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      const cards = Number(next.numberOfCards) || 0;
      const price = Number(next.pricePerCard) || 0;

      if (field === 'numberOfCards' || field === 'pricePerCard') {
        next.totalAmount = cards && price ? String(cards * price) : next.totalAmount;
      }

      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
    if (!initialValues?.id) {
      setForm({ ...EMPTY_FORM });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-sm border border-gray-300 bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-800 sm:text-base">
        Record Sale
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">Player Name</span>
          <input
            required
            value={form.playerName}
            onChange={(e) => updateField('playerName', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">Phone Number</span>
          <input
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">Card Number (Cartela)</span>
          <input
            required
            value={form.cardNumber}
            onChange={(e) => updateField('cardNumber', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">Number of Cards</span>
          <input
            required
            type="number"
            min="1"
            value={form.numberOfCards}
            onChange={(e) => updateField('numberOfCards', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">Price Per Card</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.pricePerCard}
            onChange={(e) => updateField('pricePerCard', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">Total Amount</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.totalAmount}
            onChange={(e) => updateField('totalAmount', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">Payment Status</span>
          <select
            value={form.paymentStatus}
            onChange={(e) => updateField('paymentStatus', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm sm:col-span-2 lg:col-span-4">
          <span className="mb-1 block text-gray-700">Notes</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-sm bg-gradient-to-b from-[#5da3e8] to-[#4a8fd4] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-105"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
