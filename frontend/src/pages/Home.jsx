import Header from '../components/layout/Header';
import StatCard from '../components/ui/StatCard';
import WelcomeBanner from '../components/ui/WelcomeBanner';
import { useUser } from '../context/UserContext';
import { BookIcon, DollarIcon, GridIcon } from '../components/icons/StatIcons';

const STATS = [
  {
    id: 'today-games',
    value: '55',
    label: 'Today Games',
    accentColor: 'var(--color-lion-stat-green)',
    icon: <DollarIcon />,
    iconLabel: 'Games revenue',
  },
  {
    id: 'cartelas',
    value: '150',
    label: 'Cartelas',
    accentColor: 'var(--color-lion-stat-blue)',
    icon: <GridIcon className="h-9 w-9 sm:h-10 sm:w-10" />,
    iconLabel: 'Cartelas',
  },
  {
    id: 'code-map',
    value: '150',
    label: 'Code Map',
    accentColor: 'var(--color-lion-stat-olive)',
    icon: <BookIcon className="h-9 w-9 sm:h-10 sm:w-10" />,
    iconLabel: 'Code map',
  },
];

export default function Home() {
  const { username } = useUser();

  return (
    <div className="min-h-screen bg-lion-page">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
        <section aria-label="Welcome" className="mb-5 sm:mb-6">
          <WelcomeBanner username={username} />
        </section>

        <section aria-label="Dashboard statistics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {STATS.map((stat) => (
              <StatCard
                key={stat.id}
                value={stat.value}
                label={stat.label}
                icon={stat.icon}
                accentColor={stat.accentColor}
                iconLabel={stat.iconLabel}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
