import { useEffect, useState } from 'react';
import SidebarSettingPanel from './SidebarSettingPanel';
import SidebarSettingButton from './SidebarSettingButton';
import { SidebarSettingGridIcon } from './SidebarSettingIcons';
import {
  fetchSoundSettings,
  saveSoundSettings as saveSoundSettingsToBackend,
} from '../../services/api';
import {
  loadSidebarSoundSettings,
  saveSidebarSoundSettings,
  SIDEBAR_VOICE_OPTIONS,
} from '../../utils/sidebarSettingsStorage';

export default function SidebarSoundSettingCard() {
  const [speed, setSpeed] = useState('4');
  const [voice, setVoice] = useState('Lion Male');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const result = await fetchSoundSettings();
      if (cancelled) return;

      if (result.ok) {
        const nextSpeed = String(result.speed ?? '4');
        const nextVoice = result.voice ?? 'Lion Male';
        setSpeed(nextSpeed);
        setVoice(nextVoice);
        saveSidebarSoundSettings({ speed: nextSpeed, voice: nextVoice });
        return;
      }

      const settings = loadSidebarSoundSettings();
      setSpeed(String(settings.speed ?? '4'));
      setVoice(settings.voice ?? 'Lion Male');
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    saveSidebarSoundSettings({ speed, voice });
    const result = await saveSoundSettingsToBackend({ speed, voice });
    if (result.ok) {
      const nextSpeed = String(result.speed ?? speed);
      const nextVoice = result.voice ?? voice;
      setSpeed(nextSpeed);
      setVoice(nextVoice);
      saveSidebarSoundSettings({ speed: nextSpeed, voice: nextVoice });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SidebarSettingPanel icon={<SidebarSettingGridIcon />} title="Sound Setting">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-gray-900">Speed</span>
          <input
            type="text"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            className="w-full rounded-sm border border-gray-300 px-3 py-2 text-sm text-gray-900 transition focus:border-[#4a90e2] focus:outline-none focus:ring-2 focus:ring-[#4a90e2]/30"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-gray-900">Voice</span>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition focus:border-[#4a90e2] focus:outline-none focus:ring-2 focus:ring-[#4a90e2]/30"
          >
            {SIDEBAR_VOICE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <SidebarSettingButton onClick={handleSave}>Update Setting</SidebarSettingButton>
          {saved && <span className="text-sm font-medium text-[#1f8f3a]">Saved</span>}
        </div>
      </div>
    </SidebarSettingPanel>
  );
}
