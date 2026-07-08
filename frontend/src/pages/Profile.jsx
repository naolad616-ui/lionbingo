import Header from '../components/layout/Header';
import ProfileCard from '../components/profile/ProfileCard';
import EditProfileLink from '../components/profile/EditProfileLink';
import { useUser } from '../context/UserContext';

export default function Profile() {
  const { displayName, avatarUrl } = useUser();

  return (
    <div className="min-h-screen bg-lion-page-pattern">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12">
        <section aria-label="User profile" className="w-full max-w-[430px]">
          <ProfileCard displayName={displayName} avatarUrl={avatarUrl} />

          <div className="mt-3 pl-1 sm:mt-4">
            <EditProfileLink href="/settings" />
          </div>
        </section>
      </main>
    </div>
  );
}
