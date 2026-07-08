import Header from '../components/layout/Header';
import ChangePhotoPanel from '../components/settings/ChangePhotoPanel';
import EditAccountPanel from '../components/settings/EditAccountPanel';

export default function Settings() {
  return (
    <div className="min-h-screen bg-lion-page">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 xl:gap-8">
          <ChangePhotoPanel />
          <EditAccountPanel />
        </div>
      </main>
    </div>
  );
}
