import { useEffect, useState } from 'react';
import CommissionPanel from './CommissionPanel';
import SidebarSettingButton from '../sidebar-setting/SidebarSettingButton';
import {
  loadCommissionRates,
  saveCommissionRates,
} from '../../utils/commissionStorage';
import { fetchCommissionTiers, saveCommissionTiers } from '../../services/api';

export default function CommissionEditCard() {
  const [tiers, setTiers] = useState(() => loadCommissionRates());
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const result = await fetchCommissionTiers();
      if (result.ok && result.tiers?.length) {
        setTiers(result.tiers);
        saveCommissionRates(result.tiers);
      }
    })();
  }, []);

  const handleValueChange = (id, value) => {
    setTiers((current) =>
      current.map((tier) => (tier.id === id ? { ...tier, value } : tier)),
    );
  };

  const handleSave = async () => {
    const normalized = tiers.map((tier) => ({
      ...tier,
      value: Number(tier.value) || 0,
    }));
    setTiers(normalized);
    saveCommissionRates(normalized);

    const result = await saveCommissionTiers(normalized);
    if (result.ok) {
      setTiers(result.tiers);
      saveCommissionRates(result.tiers);
      setMessage('Saved. Future games will use these rates.');
    } else {
      setMessage(result.error || 'Saved locally. Backend sync failed.');
    }
  };

  return (
    <CommissionPanel>
      <div className="space-y-2.5 sm:space-y-3">
        {tiers.map((tier) => (
          <div key={tier.id} className="flex items-center gap-3">
            <span className="w-[4.5rem] shrink-0 text-sm font-bold text-gray-900 sm:w-[5rem]">
              {tier.label}
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={tier.value}
                onChange={(e) => handleValueChange(tier.id, e.target.value)}
                className="w-14 rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-right text-sm text-gray-900 transition focus:border-[#4a90e2] focus:outline-none focus:ring-2 focus:ring-[#4a90e2]/30 sm:w-16"
              />
              <span className="text-sm font-bold text-gray-900">%</span>
            </div>
          </div>
        ))}

        {message ? (
          <p className="text-xs font-medium text-gray-700">{message}</p>
        ) : null}

        <div className="pt-2">
          <SidebarSettingButton onClick={() => void handleSave()}>
            Update Comission
          </SidebarSettingButton>
        </div>
      </div>
    </CommissionPanel>
  );
}
