import Header from '../../components/layout/Header';
import SidebarSoundSettingCard from '../../components/sidebar-setting/SidebarSoundSettingCard';
import SidebarCheckingPatternCard from '../../components/sidebar-setting/SidebarCheckingPatternCard';

export default function SidebarSetting() {
  return (
    <div className="min-h-screen bg-lion-page">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:gap-8">
          <SidebarSoundSettingCard />
          <SidebarCheckingPatternCard />
        </div>
      </main>
    </div>
  );
}
