import { useEffect, useState } from 'react';
import {
  fetchAdminCommission,
  saveAdminCommission,
} from '../../services/adminApi';
import { saveCommissionRates } from '../../utils/commissionStorage';
import { getSocket } from '../../services/socket';

export default function AdminCommission() {
  const [tiers, setTiers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await fetchAdminCommission();
      if (!result.ok) {
        setError(result.error || 'Failed to load commission tiers.');
        return;
      }
      setTiers(result.tiers);
    })();
  }, []);

  const handleValueChange = (id, value) => {
    setTiers((current) =>
      current.map((tier) => (tier.id === id ? { ...tier, value } : tier)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    const normalized = tiers.map((tier) => ({
      ...tier,
      value: Number(tier.value) || 0,
    }));

    const result = await saveAdminCommission(normalized);
    setSaving(false);

    if (!result.ok) {
      setError(result.error || 'Failed to save commission.');
      return;
    }

    setTiers(result.tiers);
    saveCommissionRates(result.tiers);

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('commission:save', { tiers: result.tiers });

    setMessage('Commission rules saved. Future games will use these rates.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Commission Management</h2>
        <p className="mt-1 text-sm text-slate-400">
          Set commission % by cards sold. Saved rules apply to future games automatically.
        </p>
      </div>

      <div className="admin-card max-w-xl rounded-2xl border border-white/10 p-6">
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="flex items-center justify-between gap-4">
              <span className="w-28 text-sm font-semibold text-slate-200">{tier.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="admin-input w-24 text-right"
                  value={tier.value}
                  onChange={(event) => handleValueChange(tier.id, event.target.value)}
                />
                <span className="text-sm font-bold text-amber-300">%</span>
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="admin-btn-primary"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="admin-btn-secondary"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
