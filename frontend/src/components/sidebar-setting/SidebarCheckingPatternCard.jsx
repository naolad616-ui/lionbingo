import { useEffect, useState } from 'react';
import SidebarSettingPanel from './SidebarSettingPanel';
import SidebarSettingButton from './SidebarSettingButton';
import SidebarSettingCheckbox from './SidebarSettingCheckbox';
import { SidebarSettingGridIcon } from './SidebarSettingIcons';
import {
  fetchPatternSettings,
  savePatternSettings as savePatternSettingsToBackend,
} from '../../services/api';
import {
  loadSidebarPatternSettings,
  SIDEBAR_PATTERN_ITEMS,
  saveSidebarPatternSettings,
} from '../../utils/sidebarSettingsStorage';

export default function SidebarCheckingPatternCard() {
  const [patterns, setPatterns] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPatterns() {
      const result = await fetchPatternSettings();
      if (cancelled) return;

      if (result.ok && result.patterns) {
        setPatterns(result.patterns);
        saveSidebarPatternSettings(result.patterns);
        return;
      }

      setPatterns(loadSidebarPatternSettings());
    }

    loadPatterns();

    return () => {
      cancelled = true;
    };
  }, []);

  const togglePattern = (id, checked) => {
    setPatterns((current) => ({ ...current, [id]: checked }));
  };

  const handleSave = async () => {
    saveSidebarPatternSettings(patterns);
    const result = await savePatternSettingsToBackend(patterns);
    if (result.ok && result.patterns) {
      setPatterns(result.patterns);
      saveSidebarPatternSettings(result.patterns);
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SidebarSettingPanel icon={<SidebarSettingGridIcon />} title="Checking Pattern">
      <div className="space-y-1">
        {SIDEBAR_PATTERN_ITEMS.map((item) => (
          <SidebarSettingCheckbox
            key={item.id}
            id={item.id}
            label={item.label}
            checked={Boolean(patterns[item.id])}
            onChange={(checked) => togglePattern(item.id, checked)}
          />
        ))}

        <div className="flex items-center gap-3 pt-4">
          <SidebarSettingButton onClick={handleSave}>Update Pattern</SidebarSettingButton>
          {saved && <span className="text-sm font-medium text-[#1f8f3a]">Saved</span>}
        </div>
      </div>
    </SidebarSettingPanel>
  );
}
